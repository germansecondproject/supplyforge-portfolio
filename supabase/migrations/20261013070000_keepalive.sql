-- Keeps the free-tier project from pausing for inactivity: a scheduled GitHub
-- Action calls keepalive_ping() with the anon key, which bumps a counter.
create table if not exists public.keepalive (
  id smallint primary key default 1 check (id = 1),
  ping_count bigint not null default 0,
  last_ping_at timestamptz
);
insert into public.keepalive (id) values (1) on conflict (id) do nothing;
alter table public.keepalive enable row level security;
revoke all on public.keepalive from anon, authenticated;

create or replace function public.keepalive_ping()
returns table (ping_count bigint, last_ping_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  update public.keepalive k
     set ping_count = k.ping_count + 1,
         last_ping_at = now()
   where k.id = 1
  returning k.ping_count, k.last_ping_at;
$$;

revoke all on function public.keepalive_ping() from public, authenticated;
grant execute on function public.keepalive_ping() to anon;
