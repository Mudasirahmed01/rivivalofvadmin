-- Run once in Supabase SQL Editor if admin dashboard reports
-- "Could not find the table public.store_settings in the schema cache".

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

drop policy if exists "Store settings are public" on public.store_settings;
drop policy if exists "Admins manage store settings" on public.store_settings;

create policy "Store settings are public"
  on public.store_settings
  for select
  to anon, authenticated
  using (true);

create policy "Admins manage store settings"
  on public.store_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.store_settings (key, value)
values
  ('checkout', '{"free_shipping_threshold":50000,"delivery_charge":250,"tax_rate":8}'::jsonb),
  ('marquee', '{"items":["NEW COLLECTION 01","FREE SHIPPING OVER RS 50,000","PREMIUM ORGANIC COTTON","ARCHITECTURAL SILHOUETTES","SUSTAINABLE FASHION"]}'::jsonb)
on conflict (key) do nothing;
