-- Server-side catalogue queries, so the store never loads the whole catalogue: listings, facets and search run here and
-- return one page of product ids; the store then reads only those rows.

-- One row per product with what listings filter and sort on, plus live availability from stock.
create view public.product_index with (security_invoker = on) as
select
  p.id, p.slug, p.sku, p.name, p.category, p.subcategory, p.brand, p.family,
  p.standard, p.material, p.diameter_mm, p.length_mm, p.size_label,
  p.pack_qty, p.sale_price_ex_vat, p.discount_pct, p.unavailable, p.rating, p.review_count,
  coalesce(a.available, 0) as available,
  (not p.unavailable and coalesce(a.available, 0) > 0) as buyable,
  round(p.sale_price_ex_vat / p.pack_qty, 4) as unit_price,
  lower(replace(p.name, '×', 'x') || ' ' || p.sku || ' ' || coalesce(p.standard, '') || ' ' || b.name || ' ' || s.name || ' ' || c.name) as search_text
from public.products p
join public.brands b on b.slug = p.brand
join public.subcategories s on s.category = p.category and s.slug = p.subcategory
join public.categories c on c.slug = p.category
left join lateral (select sum(st.quantity - st.reserved)::int as available from public.stock st where st.product_id = p.id) a on true;

create index if not exists products_sku_lower_idx on public.products (lower(sku));
create index if not exists products_reviews_idx on public.products (review_count desc);
create index if not exists products_discount_idx on public.products (discount_pct) where discount_pct > 0;

/* One page of a listing plus facet counts.
   Facets follow the store rules: each facet counts the products that match every other active filter. */
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
  with base as (
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
      and (p_tokens is null or cardinality(p_tokens) = 0 or i.search_text like all (select '%' || t || '%' from unnest(p_tokens) t))
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

-- Products per category and subcategory, keyed 'category/subcategory'.
create or replace function public.catalog_counts() returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(category || '/' || subcategory, n), '{}'::jsonb)
  from (select category, subcategory, count(*) as n from public.products group by 1, 2) x;
$$;

-- The variant axes of one family: enough to build the size selector and pick similar sizes without loading full rows.
create or replace function public.family_index(p_family text) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'slug', slug, 'mat', material, 'd', diameter_mm, 'len', length_mm, 'size', size_label,
    'stock', greatest(available, 0), 'unavailable', unavailable) order by id), '[]'::jsonb)
  from public.product_index
  where family = p_family;
$$;

-- Standard boxes of bolts and screws for the home page size finder: [type, material, diameter, length, in stock].
create or replace function public.finder_index() returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_array(replace(family, 'bolt-', ''), material, diameter_mm, length_mm, buyable::int)
    order by family, material, diameter_mm, length_mm), '[]'::jsonb)
  from public.product_index
  where family in ('bolt-hex', 'bolt-socket', 'bolt-flat', 'bolt-wood');
$$;

grant execute on function public.catalog_listing(text, text, boolean, text[], numeric, int, text[], text[], text[], numeric[], int[], boolean, boolean, text, int, int) to anon, authenticated;
grant execute on function public.catalog_counts() to anon, authenticated;
grant execute on function public.family_index(text) to anon, authenticated;
grant execute on function public.finder_index() to anon, authenticated;
grant select on public.product_index to anon, authenticated;
