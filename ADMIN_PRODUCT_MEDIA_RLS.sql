-- Allow public reads for media/variants belonging to published products,
-- and allow admins to manage product_images and product_variants.
-- Run in Supabase SQL Editor after SUPABASE_RLS_FIX.sql.

alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;

drop policy if exists "Public can read published product images" on public.product_images;
drop policy if exists "Admins manage product images" on public.product_images;
drop policy if exists "Public can read published product variants" on public.product_variants;
drop policy if exists "Admins manage product variants" on public.product_variants;

create policy "Public can read published product images"
  on public.product_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.is_published = true
    )
    or public.is_admin()
  );

create policy "Admins manage product images"
  on public.product_images
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read published product variants"
  on public.product_variants
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_variants.product_id
        and products.is_published = true
    )
    or public.is_admin()
  );

create policy "Admins manage product variants"
  on public.product_variants
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
