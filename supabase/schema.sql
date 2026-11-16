-- Skema Database & Storage CimoFood (Supabase / PostgreSQL)
-- Jalankan isi file ini di SQL Editor dashboard Supabase saat siap live.

create extension if not exists "pgcrypto";

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
  tracking_number text,
  packing_proof_url text,
  referral_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  admin_whatsapp text not null default '',
  bank_info text not null default '[DATA REKENING & QRIS MITRA PENDING]',
  qris_image_url text,
  packing_fee integer not null default 2000,
  pirt_number text not null default '[NOMOR PIRT PENDING]',
  halal_number text not null default '[NOMOR HALAL PENDING]',
  updated_at timestamptz not null default now()
);

-- RLS: Katalog dan pengaturan umum dapat dibaca publik; tabel order hanya lewat API server / admin terautentikasi
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_settings enable row level security;

create policy "Public read active products"
  on public.products for select
  using (is_active = true);

create policy "Public read product variants"
  on public.product_variants for select
  using (true);

create policy "Public read site settings"
  on public.site_settings for select
  using (true);

create policy "Authenticated admin full access products"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admin full access variants"
  on public.product_variants for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admin full access orders"
  on public.orders for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admin full access order_items"
  on public.order_items for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admin full access site_settings"
  on public.site_settings for all
  to authenticated
  using (true)
  with check (true);

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Pengaturan awal
insert into public.site_settings (id, admin_whatsapp, bank_info, packing_fee, pirt_number, halal_number)
values (
  1,
  '',
  '[DATA REKENING BANK & QRIS MITRA PENDING]',
  2000,
  '[NOMOR PIRT PENDING]',
  '[NOMOR HALAL PENDING]'
)
on conflict (id) do nothing;

-- Seed awal produk Cimoring (CATATAN: harga adalah contoh laporan, wajib diperbarui sesuai daftar harga resmi mitra)
with inserted_products as (
  insert into public.products (slug, name, category, description, image_url, sort_order)
  values
    ('pedas', 'Cimoring Pedas', 'varian', 'Keripik aci renyah dengan baluran bumbu cabai pedas gurih.', '/images/cimoring-pedas.jpg', 1),
    ('balado', 'Cimoring Balado', 'varian', 'Rasa balado manis pedas yang akrab untuk camilan harian atau oleh-oleh.', '/images/cimoring-balado.jpg', 2),
    ('original', 'Cimoring Original', 'varian', 'Gurih murni tanpa bumbu tabur. Dikemas dengan tekanan kardus khusus agar plastik tetap rapat.', '/images/cimoring-original.jpg', 3),
    ('barbecue', 'Cimoring Barbecue', 'varian', 'Bumbu panggang manis gurih beraroma smokey ringan.', '/images/cimoring-barbecue.jpg', 4),
    ('balado-asin', 'Cimoring Balado Asin', 'varian', 'Perpaduan pedas ringan balado dengan sentuhan asin gurih.', '/images/cimoring-balado-asin.jpg', 5),
    ('varian-6-pending', '[Varian ke-6: Konfirmasi Mitra]', 'varian', 'Slot varian rasa ke-6 menunggu konfirmasi nama rasa resmi dari UMKM Cimoring.', '/placeholders/product-placeholder.svg', 6),
    ('hampers-lebaran', 'Paket Hampers Cimoring', 'hampers', 'Paket bundling isi pilihan varian dengan kemasan hadiah rapi dan kartu ucapan.', '/images/cimoring-hampers.jpg', 7)
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_variants (product_id, size_label, weight_grams, base_price, sell_price, shopee_price, is_available, stock_note)
select p.id, v.size_label, v.weight_grams, v.base_price, v.sell_price, v.shopee_price, v.is_available, v.stock_note
from inserted_products p
join (
  values
    ('pedas', '200 g', 200, 10000, 12500, null, true, 'Contoh harga laporan'),
    ('pedas', '250 g', 250, 15000, 18000, null, true, 'Contoh harga laporan'),
    ('pedas', '500 g', 500, 20000, 24000, null, true, 'Contoh harga laporan'),
    ('pedas', 'Bal 2 kg', 2000, 45000, 49500, null, true, 'Contoh harga laporan'),
    ('balado', '200 g', 200, 10000, 12500, null, true, 'Contoh harga laporan'),
    ('balado', '250 g', 250, 15000, 18000, null, true, 'Contoh harga laporan'),
    ('balado', '500 g', 500, 20000, 24000, null, true, 'Contoh harga laporan'),
    ('balado', 'Bal 2 kg', 2000, 45000, 49500, null, true, 'Contoh harga laporan'),
    ('original', '200 g', 200, 10000, 12500, null, true, 'Kemasan sensitif: SOP tekanan ringan'),
    ('original', '250 g', 250, 15000, 18000, null, true, 'Kemasan sensitif: SOP tekanan ringan'),
    ('original', '500 g', 500, 20000, 24000, null, true, 'Kemasan sensitif: SOP tekanan ringan'),
    ('original', 'Bal 2 kg', 2000, 45000, 49500, null, true, 'Kemasan sensitif: SOP tekanan ringan'),
    ('barbecue', '200 g', 200, 10000, 12500, null, true, 'Contoh harga laporan'),
    ('barbecue', '250 g', 250, 15000, 18000, null, true, 'Contoh harga laporan'),
    ('barbecue', '500 g', 500, 20000, 24000, null, true, 'Contoh harga laporan'),
    ('barbecue', 'Bal 2 kg', 2000, 45000, 49500, null, true, 'Contoh harga laporan'),
    ('balado-asin', '200 g', 200, 10000, 12500, null, true, 'Contoh harga laporan'),
    ('balado-asin', '250 g', 250, 15000, 18000, null, true, 'Contoh harga laporan'),
    ('balado-asin', '500 g', 500, 20000, 24000, null, true, 'Contoh harga laporan'),
    ('balado-asin', 'Bal 2 kg', 2000, 45000, 49500, null, true, 'Contoh harga laporan'),
    ('varian-6-pending', '250 g', 250, 15000, 18000, null, false, 'Menunggu konfirmasi rasa ke-6'),
    ('hampers-lebaran', 'Paket Bundling 3 Rasa', 750, 60000, 78000, null, true, 'Contoh harga laporan')
) as v(slug, size_label, weight_grams, base_price, sell_price, shopee_price, is_available, stock_note)
on p.slug = v.slug;
