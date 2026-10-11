-- Search that forgives typos, and suggestions for the search box.
-- Every word (without digits) of the catalogue's search text goes into search_terms; a search word that appears in no product is
-- replaced by the closest catalogue word (pg_trgm similarity), so "scrw" finds screws and "anchr" finds anchors.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.search_terms (
  term text primary key,
  n int not null
);
alter table public.search_terms enable row level security;
create policy "catalogue is public" on public.search_terms for select to anon, authenticated using (true);
revoke all on public.search_terms from anon, authenticated;
grant select on public.search_terms to anon, authenticated;
create index if not exists search_terms_trgm_idx on public.search_terms using gin (term extensions.gin_trgm_ops);

-- Adds new words and refreshes counts. Run it after changing product names, brands or categories.
create or replace function public.refresh_search_terms() returns int
language sql
security invoker
set search_path = ''
as $$
  with fresh as (
    select w as term, count(*)::int as n
    from public.product_index i, regexp_split_to_table(i.search_text, '[^[:alnum:].\-]+') w
    where length(w) >= 3 and w !~ '[0-9]'
    group by w
  ), up as (
    insert into public.search_terms (term, n) select term, n from fresh
    on conflict (term) do update set n = excluded.n
    returning 1
  )
  select count(*)::int from up;
$$;
revoke all on function public.refresh_search_terms() from public, anon, authenticated;
select public.refresh_search_terms();

-- Keeps words that occur in the catalogue and swaps unknown ones for the most similar catalogue word.
-- Anything with a digit (part numbers, sizes, standards) and words shorter than 3 letters are kept as typed.
-- The word list holds only words without digits (about 800), so the similarity scan is cheap.
create or replace function public.fix_tokens(p_tokens text[]) returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(coalesce(
    case when length(t) < 3 or t ~ '[0-9]'
           or exists (select 1 from public.search_terms s where s.term like '%' || t || '%') then t end,
    (select s.term from public.search_terms s
      where s.term !~ '[0-9]' and extensions.similarity(s.term, t) > 0.2
      order by extensions.similarity(s.term, t) desc, s.n desc, s.term
      limit 1),
    t) order by o), '{}')
  from unnest(p_tokens) with ordinality u(t, o);
$$;
grant execute on function public.fix_tokens(text[]) to anon, authenticated;

-- catalog_listing() now searches with the corrected words and returns them as "tokens".
create or replace function public.catalog_listing(
  p_category text default null,
  p_sub text default null,
  p_offers_only boolean default false,
  p_tokens text[] default null,
  p_d numeric default null,
  p_len int default null,
  f_brand text[] default '{}',
  f_mat text[] default '{}',
  f_std text[] default '{}',
  f_d numeric[] default '{}',
  f_len int[] default '{}',
  f_stock boolean default false,
  f_offers boolean default false,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with toks as (select public.fix_tokens(p_tokens) as t),
  base as (
    select i.*,
      (cardinality(f_brand) = 0 or i.brand = any (f_brand)) as ok_brand,
      (cardinality(f_mat) = 0 or i.material = any (f_mat)) as ok_mat,
      (cardinality(f_std) = 0 or i.standard = any (f_std)) as ok_std,
      (cardinality(f_d) = 0 or i.diameter_mm = any (f_d)) as ok_d,
      (cardinality(f_len) = 0 or i.length_mm = any (f_len)) as ok_len
    from public.product_index i
    where (p_category is null or i.category = p_category)
      and (p_sub is null or i.subcategory = p_sub)
      and (not p_offers_only or i.discount_pct > 0)
      and (p_d is null or i.diameter_mm = p_d)
      and (p_len is null or i.length_mm = p_len)
      and (cardinality((select t from toks)) = 0 or i.search_text like all (select '%' || x || '%' from unnest((select t from toks)) x))
      and (not f_stock or i.buyable)
      and (not f_offers or i.discount_pct > 0)
  ),
  hits as (
    select * from base where ok_brand and ok_mat and ok_std and ok_d and ok_len
  ),
  page as (
    select id from hits
    order by
      case when p_sort = 'price-asc' then unit_price end asc,
      case when p_sort = 'price-desc' then unit_price end desc,
      case when p_sort = 'rating' then rating end desc,
      case when p_sort = 'name' then name end asc,
      case when p_sort = 'discount' then discount_pct end desc,
      case when p_sort in ('relevance', 'discount') then buyable::int end desc,
      review_count desc,
      id
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
  )
  select jsonb_build_object(
    'tokens', to_jsonb((select t from toks)),
    'total', (select count(*) from hits),
    'ids', coalesce((select jsonb_agg(id) from page), '[]'::jsonb),
    'facets', jsonb_build_object(
      'brand', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select brand as v, count(*) as n from base where ok_mat and ok_std and ok_d and ok_len group by 1) x),
      'mat', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select material as v, count(*) as n from base where ok_brand and ok_std and ok_d and ok_len and material is not null group by 1) x),
      'std', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select standard as v, count(*) as n from base where ok_brand and ok_mat and ok_d and ok_len and standard is not null group by 1) x),
      'd', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select trim_scale(diameter_mm)::text as v, count(*) as n from base where ok_brand and ok_mat and ok_std and ok_len and diameter_mm is not null group by 1) x),
      'len', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select length_mm::text as v, count(*) as n from base where ok_brand and ok_mat and ok_std and ok_d and length_mm is not null group by 1) x)
    )
  );
$$;
grant execute on function public.catalog_listing(text, text, boolean, text[], numeric, int, text[], text[], text[], numeric[], int[], boolean, boolean, text, int, int) to anon, authenticated;

-- Search box suggestions: the corrected words, the number of matches and the six best products.
create or replace function public.search_suggest(p_tokens text[], p_d numeric default null, p_len int default null) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with toks as (select public.fix_tokens(p_tokens) as t),
  hits as (
    select i.* from public.product_index i
    where (p_d is null or i.diameter_mm = p_d)
      and (p_len is null or i.length_mm = p_len)
      and (cardinality((select t from toks)) = 0 or i.search_text like all (select '%' || x || '%' from unnest((select t from toks)) x))
  ), top as (
    select slug, sku, name, sale_price_ex_vat, pack_qty, buyable from hits
    order by buyable desc, review_count desc, id
    limit 6
  )
  select jsonb_build_object(
    'tokens', to_jsonb((select t from toks)),
    'total', (select count(*) from hits),
    'items', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'ref', sku, 'name', name, 'price', sale_price_ex_vat, 'pack', pack_qty, 'buyable', buyable)) from top), '[]'::jsonb)
  );
$$;
grant execute on function public.search_suggest(text[], numeric, int) to anon, authenticated;
