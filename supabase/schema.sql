-- Skema Database, RLS, & Storage CimoFood (Supabase / PostgreSQL)
-- Aman dijalankan berulang (idempoten) di SQL Editor Supabase.

create extension if not exists "pgcrypto";

create or replace function public.cimofood_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('varian', 'hampers')),
  description text not null default '',
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_label text not null,
  weight_grams integer not null default 250,
  base_price integer not null check (base_price >= 0),
  sell_price integer not null check (sell_price >= 0),
  shopee_price integer,
  is_available boolean not null default true,
  stock_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_name text not null,
  customer_whatsapp text not null,
  shipping_address text not null,
  courier text not null,
  subtotal_sell integer not null default 0,
  subtotal_base integer not null default 0,
  packing_fee integer not null default 2000,
  shipping_cost integer not null default 0,
  total_amount integer not null default 0,
  status text not null default 'menunggu_konfirmasi' check (
    status in (
      'menunggu_konfirmasi',
      'menunggu_pembayaran',
      'verifikasi_bayar',
      'dibayar',
      'dikemas',
      'dikirim',
      'selesai',
      'dibatalkan'
    )
  ),
  payment_proof_url text,
  payment_provider text,
  payment_order_id text,
  payment_snap_token text,
  payment_redirect_url text,
  payment_method text,
  payment_reference text,
  payment_fee integer not null default 0,
  paid_at timestamptz,
  tracking_number text,
  packing_proof_url text,
  referral_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tambahan kolom idempoten jika tabel orders sudah dibuat sebelumnya
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_order_id text;
alter table public.orders add column if not exists payment_snap_token text;
alter table public.orders add column if not exists payment_redirect_url text;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_fee integer not null default 0;
alter table public.orders add column if not exists paid_at timestamptz;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  size_label text not null,
  quantity integer not null check (quantity > 0),
  unit_base_price integer not null,
  unit_sell_price integer not null
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null default 'midtrans',
  gateway_order_id text not null,
  transaction_id text,
  transaction_status text not null,
  payment_type text,
  gross_amount integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  admin_whatsapp text not null default '',
  bank_info text not null default 'Transfer Bank & QRIS Resmi CimoFood',
  qris_image_url text,
  packing_fee integer not null default 2000,
  pirt_number text not null default 'Terdaftar Dinas Kesehatan',
  halal_number text not null default 'Tersertifikasi Halal',
  updated_at timestamptz not null default now()
);

-- Indeks untuk query tracking order, antrean admin, dan webhook pembayaran
create index if not exists idx_orders_code_wa on public.orders (order_code, customer_whatsapp);
create index if not exists idx_orders_payment_order_id on public.orders (payment_order_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_payment_events_order_id on public.payment_events (order_id);
create index if not exists idx_payment_events_gateway_id on public.payment_events (gateway_order_id);

-- Trigger updated_at otomatis
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.cimofood_set_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.cimofood_set_updated_at();

-- RLS: Publik hanya boleh membaca produk aktif, varian, dan pengaturan toko.
-- Tabel transaksi (orders, order_items, payment_events) & penulisan admin diakses server via SERVICE_ROLE_KEY atau admin ber-role JWT khusus.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products"
  on public.products for select
  using (is_active = true);

drop policy if exists "Public read product variants" on public.product_variants;
create policy "Public read product variants"
  on public.product_variants for select
  using (true);

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
  on public.site_settings for select
  using (true);

drop policy if exists "Authenticated admin full access products" on public.products;
create policy "Authenticated admin full access products"
  on public.products for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Authenticated admin full access variants" on public.product_variants;
create policy "Authenticated admin full access variants"
  on public.product_variants for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Authenticated admin full access orders" on public.orders;
create policy "Authenticated admin full access orders"
  on public.orders for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Authenticated admin full access order_items" on public.order_items;
create policy "Authenticated admin full access order_items"
  on public.order_items for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Authenticated admin full access payment_events" on public.payment_events;
create policy "Authenticated admin full access payment_events"
  on public.payment_events for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Authenticated admin full access site_settings" on public.site_settings;
create policy "Authenticated admin full access site_settings"
  on public.site_settings for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Pengaturan awal toko
insert into public.site_settings (id, admin_whatsapp, bank_info, packing_fee, pirt_number, halal_number)
values (
  1,
  '',
  'Transfer Bank & QRIS Resmi CimoFood',
  2000,
  'Terdaftar Dinas Kesehatan',
  'Tersertifikasi Halal'
)
on conflict (id) do nothing;

-- Seed awal produk Cimoring (sesuai data toko aktif; harga tetap bisa diubah lewat /admin)
with inserted_products as (
  insert into public.products (slug, name, category, description, image_url, is_active, sort_order)
  values
    ('pedas', 'Cimoring Pedas', 'varian', 'Keripik aci renyah dengan baluran bumbu cabai pedas gurih.', '/images/cimoring-pedas.jpg', true, 1),
    ('balado', 'Cimoring Balado', 'varian', 'Bumbu balado manis pedas yang akrab untuk camilan harian atau oleh-oleh.', '/images/cimoring-balado.jpg', true, 2),
    ('original', 'Cimoring Original', 'varian', 'Gurih murni tanpa bumbu tabur. Dikemas dengan tekanan kardus lebih ringan agar kantong tetap rapat.', '/images/cimoring-original.jpg', true, 3),
    ('barbecue', 'Cimoring Barbecue', 'varian', 'Rasa panggang manis gurih dengan aroma smokey ringan untuk semua usia.', '/images/cimoring-barbecue.jpg', true, 4),
    ('balado-asin', 'Cimoring Balado Asin', 'varian', 'Kombinasi balado ringan dan rasa asin gurih yang seimbang.', '/images/cimoring-balado-asin.jpg', true, 5),
    ('varian-6-pending', '[Varian ke-6: Konfirmasi Mitra]', 'varian', 'Slot varian rasa ke-6 menunggu konfirmasi nama rasa dan harga resmi dari UMKM Cimoring.', '/placeholders/product-placeholder.svg', false, 6),
    ('hampers-lebaran', 'Paket Hampers Cimoring', 'hampers', 'Paket bundling isi pilihan varian dalam kemasan hadiah rapi dan kartu ucapan untuk oleh-oleh atau Lebaran.', '/images/cimoring-hampers.jpg', true, 7)
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_variants (product_id, size_label, weight_grams, base_price, sell_price, shopee_price, is_available, stock_note)
select p.id, v.size_label, v.weight_grams, v.base_price, v.sell_price, v.shopee_price, v.is_available, v.stock_note
from inserted_products p
join (
  values
    ('pedas', '200 g', 200, 10000, 12500, null::integer, true, null::text),
    ('pedas', '250 g', 250, 15000, 18000, null::integer, true, null::text),
    ('pedas', '500 g', 500, 20000, 24000, null::integer, true, null::text),
    ('pedas', 'Bal 2 kg', 2000, 45000, 49500, null::integer, true, null::text),
    ('balado', '200 g', 200, 10000, 12500, null::integer, true, null::text),
    ('balado', '250 g', 250, 15000, 18000, null::integer, true, null::text),
    ('balado', '500 g', 500, 20000, 24000, null::integer, true, null::text),
    ('balado', 'Bal 2 kg', 2000, 45000, 49500, null::integer, true, null::text),
    ('original', '200 g', 200, 10000, 12500, null::integer, true, null::text),
    ('original', '250 g', 250, 15000, 18000, null::integer, true, null::text),
    ('original', '500 g', 500, 20000, 24000, null::integer, true, null::text),
    ('original', 'Bal 2 kg', 2000, 45000, 49500, null::integer, true, null::text),
    ('barbecue', '200 g', 200, 10000, 12500, null::integer, true, null::text),
    ('barbecue', '250 g', 250, 15000, 18000, null::integer, true, null::text),
    ('barbecue', '500 g', 500, 20000, 24000, null::integer, true, null::text),
    ('barbecue', 'Bal 2 kg', 2000, 45000, 49500, null::integer, true, null::text),
    ('balado-asin', '200 g', 200, 10000, 12500, null::integer, true, null::text),
    ('balado-asin', '250 g', 250, 15000, 18000, null::integer, true, null::text),
    ('balado-asin', '500 g', 500, 20000, 24000, null::integer, true, null::text),
    ('balado-asin', 'Bal 2 kg', 2000, 45000, 49500, null::integer, true, null::text),
    ('varian-6-pending', '250 g', 250, 15000, 18000, null::integer, false, 'Menunggu konfirmasi mitra'),
    ('hampers-lebaran', 'Bundling 3 Rasa', 750, 60000, 78000, null::integer, true, null::text)
) as v(slug, size_label, weight_grams, base_price, sell_price, shopee_price, is_available, stock_note)
on p.slug = v.slug;
