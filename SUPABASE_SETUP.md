# Panduan Penyiapan Database Supabase CimoFood (Tahap 1)

Ikuti langkah berurutan ini saat membuat proyek Supabase pertama kali agar website terhubung penuh ke PostgreSQL, Storage, dan Auth admin yang aman.

## 1. Buat Proyek Supabase
1. Buka dashboard [Supabase](https://supabase.com/dashboard) dan login dengan akun GitHub / email tim.
2. Klik **New Project**, isi nama misalnya `cimofood-prod`, buat Database Password yang kuat (simpan baik-baik), lalu pilih region **Southeast Asia (Singapore)** agar latensi rendah dari Indonesia.
3. Tunggu sekitar 1 sampai 2 menit sampai proyek selesai dibuat.

## 2. Jalankan Skema SQL & Storage
1. Buka menu **SQL Editor** di sidebar kiri Supabase Dashboard, lalu klik **New query**.
2. Salin seluruh isi file `supabase/schema.sql` dan tempelkan ke editor, lalu klik **Run**.
3. Pastikan muncul status sukses. Skema ini membuat:
   - 6 tabel (`products`, `product_variants`, `orders`, `order_items`, `payment_events`, `site_settings`)
   - 2 bucket Storage (`product-images` publik dan `payment-proofs` privat)
   - Kebijakan RLS (Row Level Security) serta data awal 5 varian aktif + slot hampers.

## 3. Kunci Pendaftaran Publik & Buat Akun Admin
1. Masuk ke **Authentication -> Sign In / Providers** (atau **Authentication -> Settings**).
2. Matikan opsi **Allow new users to sign up** supaya orang luar tidak bisa membuat akun lewat endpoint Auth publik.
3. Buka **Authentication -> Users**, klik **Add user -> Create new user**.
4. Masukkan email dan kata sandi admin pengelola (centang **Auto Confirm User**).

## 4. Salin Kunci ke `.env.local`
1. Buka **Project Settings -> API** (atau **API Keys**).
2. Di folder project `cimofood`, salin `.env.example` menjadi `.env.local` dan isi variabel berikut:
   - `NEXT_PUBLIC_SUPABASE_URL` -> Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> Anon / Publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` -> Service Role key (rahasia server, jangan dikirim ke GitHub atau browser)
   - `ADMIN_EMAILS` -> isi dengan email admin yang kamu buat pada langkah 3 (pisahkan dengan koma jika ada lebih dari satu)
3. Restart server (`npm run dev` atau `npm run start`).

## 5. Cek Status Koneksi di `/admin`
1. Buka `/admin/login` dan masuk dengan email serta kata sandi Supabase Auth yang didaftarkan.
2. Buka tab **Rekap & Pengaturan** dan lihat kartu **Status Integrasi Backend**:
   - Mode Database: `Supabase Live`
   - Tabel Database (`products`, `orders`, `payment_events`, `site_settings`): `Siap`
   - Bucket Storage (`product-images`, `payment-proofs`): `Aktif`
   - Pembatasan `ADMIN_EMAILS`: `Aktif`

## Catatan Free Tier Supabase
Proyek Free Tier akan *auto-pause* jika tidak ada aktivitas selama 7 hari berturut-turut. Selama praktik usaha 8 minggu hingga UAS, kunjungi halaman toko atau dasbor `/admin` secara rutin dan gunakan tombol **Export Laporan CSV** secara berkala sebagai cadangan data penjualan.
