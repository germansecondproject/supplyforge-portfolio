-- Placing an order now needs a signed-in customer: guests can browse and fill a basket, then sign in to check out.
revoke all on function public.place_order(text, jsonb, text, text, jsonb) from public, anon;
grant execute on function public.place_order(text, jsonb, text, text, jsonb) to authenticated;
