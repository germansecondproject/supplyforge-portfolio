-- Customer accounts (Supabase Auth): signed-in customers see the orders placed with their account.

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- Orders stay closed to the browser except for their owner, who can read them and their lines.
create policy "customers read their own orders" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "customers read their own order lines" on public.order_lines
  for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
grant select on public.orders, public.order_lines to authenticated;

/* Orders placed as a guest with the same email join the account once that email is confirmed.
   The store calls this after every sign-in. */
create or replace function public.link_guest_orders() returns int
language sql
security definer
set search_path = ''
as $$
  with me as (
    select id, lower(email) as email from auth.users where id = auth.uid() and email_confirmed_at is not null
  ), linked as (
    update public.orders o set user_id = me.id
    from me
    where o.user_id is null and lower(o.customer->>'email') = me.email
    returning 1
  )
  select count(*)::int from linked;
$$;
revoke all on function public.link_guest_orders() from public, anon;
grant execute on function public.link_guest_orders() to authenticated;

-- place_order() now records the signed-in customer, if any.
create or replace function public.place_order(
  p_mode text,
  p_customer jsonb,
  p_ship text,
  p_payment text,
  p_lines jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
  prod public.products%rowtype;
  v_avail int;
  v_qty int;
  v_unit numeric(10,2);
  v_total numeric(12,2);
  v_sub numeric(12,2) := 0;
  v_ship numeric(12,2) := 0;
  v_vat numeric(12,2);
  v_id uuid := gen_random_uuid();
  v_number text;
  v_out jsonb := '[]'::jsonb;
begin
  if p_mode not in ('diy','biz') then raise exception 'invalid_mode'; end if;
  if p_ship not in ('std','exp','pickup') then raise exception 'invalid_shipping'; end if;
  if p_payment not in ('card','transfer','invoice') then raise exception 'invalid_payment'; end if;
  if p_payment = 'invoice' and p_mode <> 'biz' then raise exception 'invoice_requires_business'; end if;
  if coalesce(p_customer->>'email','') !~ '^\S+@\S+\.\S+$' then raise exception 'invalid_email'; end if;
  if coalesce(p_customer->>'address','') = '' or coalesce(p_customer->>'city','') = '' or coalesce(p_customer->>'postcode','') = '' then
    raise exception 'invalid_address';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 100 then
    raise exception 'invalid_lines';
  end if;

  v_number := 'SF-26-' || nextval('public.order_number_seq');
  insert into public.orders (id, number, mode, customer, ship_method, payment_method, subtotal, shipping, vat, total, user_id)
  values (v_id, v_number, p_mode, p_customer, p_ship, p_payment, 0, 0, 0, 0, auth.uid());

  for l in select (e->>'sku')::text as sku, (e->>'qty')::int as qty from jsonb_array_elements(p_lines) e loop
    v_qty := l.qty;
    if v_qty is null or v_qty < 1 or v_qty > 9999 then raise exception 'invalid_quantity:%', l.sku; end if;
    select * into prod from public.products where sku = l.sku;
    if not found then raise exception 'unknown_product:%', l.sku; end if;
    if prod.unavailable then raise exception 'unavailable:%', prod.sku; end if;
    select coalesce(sum(quantity - reserved), 0) into v_avail from public.stock where product_id = prod.id;
    if v_avail < v_qty then raise exception 'insufficient_stock:%:%', prod.sku, v_avail; end if;
    -- Server-side price: list price minus the product discount, minus the volume tier for box products.
    v_unit := round(prod.price_ex_vat * (1 - prod.discount_pct / 100)
      * (case when not prod.volume_pricing then 1 when v_qty >= 50 then 0.82 when v_qty >= 10 then 0.905 else 1 end), 2);
    v_total := v_unit * v_qty;
    v_sub := v_sub + v_total;
    insert into public.order_lines (order_id, product_id, sku, name, qty, unit_price, line_total)
    values (v_id, prod.id, prod.sku, prod.name, v_qty, v_unit, v_total);
    insert into public.sales (product_id, sale_date, channel, units_sold, revenue_ex_vat)
    values (prod.id, current_date, case when p_mode = 'biz' then 'b2b' else 'web' end, v_qty, v_total)
    on conflict (product_id, sale_date, channel) do update
      set units_sold = public.sales.units_sold + excluded.units_sold,
          revenue_ex_vat = public.sales.revenue_ex_vat + excluded.revenue_ex_vat;
    v_out := v_out || jsonb_build_object('sku', prod.sku, 'name', prod.name, 'qty', v_qty, 'unit_price', v_unit, 'line_total', v_total);
  end loop;

  v_ship := case p_ship when 'pickup' then 0 when 'exp' then 24.90 else (case when v_sub >= 150 then 0 else 9.90 end) end;
  v_vat := round((v_sub + v_ship) * 0.21, 2);
  update public.orders set subtotal = v_sub, shipping = v_ship, vat = v_vat, total = v_sub + v_ship + v_vat where id = v_id;

  -- Stock is validated but not decremented, so the public demo never runs dry.
  return jsonb_build_object('number', v_number, 'subtotal', v_sub, 'shipping', v_ship, 'vat', v_vat, 'total', v_sub + v_ship + v_vat, 'lines', v_out);
end;
$$;
