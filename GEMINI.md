# CimoFood: Project Context & Engineering Guidelines

Dokumen ini menjadi aturan kerja utama untuk pengembangan website **CimoFood** (Reseller Digital UMKM Cimoring).

---

## 1. Ringkasan Bisnis & Konteks Proyek
- **Konteks Akademik:** Proyek mata kuliah Kewirausahaan Berbasis Program Studi (Kelompok 2, Teknik Informatika, Universitas Muhammadiyah Purwokerto, 2026; Dosen Pengampu: Achmad Fauzan, S.Kom., M.Cs.).
- **Sifat Proyek:** Toko online UMKM sungguhan, berjalan bertahap dari **MVP (1 sampai 2 minggu)**, **Praktik Usaha 8 Minggu**, hingga **Pengembangan/Revisi sampai UAS**.
- **Mitra Produsen:** **UMKM Cimoring** (produksi mandiri sejak 2017, memiliki izin **PIRT** dan sertifikat **Halal**; usaha keluarga anggota kelompok Hilmy Nuhaqe Hanifudin).
- **Model Bisnis (Pesan Dulu, Ambil Kemudian):**
  - Kelompok tidak menyetok barang. Setelah pembayaran pembeli diverifikasi admin, tim mengambil barang dari Cimoring dengan membayar harga dasar produsen (harga reseller).
  - Akad usaha dirancang sebagai **wakalah bil ujrah** (masih menunggu konfirmasi final dosen; pisahkan tampilan harga & teks akad agar mudah direvisi).
  - **Sumber Pendapatan:** Markup/ujrah bertingkat **10 sampai 50%** sesuai kelompok produk (kecil/eceran, sedang, besar/bal 2 kg, hampers/bundling) ditambah **biaya packing aman Rp2.000/pesanan**. Harga website **tidak boleh melebihi harga produk yang sama di Shopee Cimoring**.
  - **SOP Pengemasan 4 Lapis:** Segel mesin sealer, apit kardus kanan-kiri, kardus melingkar, bubble wrap (+ foto bukti kemasan). Varian **original** memakai tekanan kardus lebih ringan karena kantong plastiknya lebih sensitif tanpa lapisan bumbu.
  - **Rencana Lanjutan:** Menyisihkan 2,5% dari laba bersih untuk infak/sedekah jika target laba tercapai.

### Alur Order CimoFood (MVP)
1. Pembeli memilih varian rasa & ukuran di web, masuk keranjang, mengisi data penerima & memilih kurir (**Mandiri/lokal**, **Anteraja**, **J&T**, atau **JNE**).
2. Pesanan tersimpan di database (`status: menunggu_konfirmasi`) dengan kode order unik, lalu web menyediakan tombol **Konfirmasi via WhatsApp** dengan format pesan terisi otomatis.
3. Admin mengecek stok riil ke Cimoring & menghitung ongkir, menginput ongkir di dasbor admin, lalu mengabari pembeli via WhatsApp (target maksimal 1 jam pada jam layanan).
4. Pembeli membayar lewat **Transfer Bank / QRIS** dan mengunggah **foto bukti pembayaran** di halaman `/cek-pesanan`.
5. Admin memverifikasi bukti bayar (`status: dibayar`), tim mengambil barang, packing sesuai SOP, kirim paket, dan menginput **nomor resi** (`status: dikirim`).
6. Pesanan dikonfirmasi selesai (`status: selesai`) dan masuk rekap laporan penjualan serta keuangan.

---

## 2. Data Mitra yang Masih Pending (Dilarang Mengarang!)
Merujuk aturan jujur terhadap data (`antislop` R-17, R-18, R-23, R-36, R-38), jangan pernah mengarang data berikut jika belum dikonfirmasi mitra/tim (gunakan placeholder eksplisit seperti `[REAL DATA]` atau jangan tampilkan dulu):
- Nama **varian rasa ke-6** (baru 5 yang terdata di wawancara: *pedas, balado, original, barbecue, balado asin*).
- Daftar **harga dasar reseller Cimoring** dan **harga pembanding Shopee** per varian dan ukuran (`200g`, `250g`, `500g`, `bal 2kg`).
- Nomor resmi **PIRT** dan **Sertifikat Halal**.
- Nomor **WhatsApp Admin**, rekening bank / gambar **QRIS**, alamat titik kirim, dan **domain** final.
- Testimoni pembeli atau angka statistik penjualan (jangan tampilkan jika belum ada transaksi nyata).

---

## 3. Tech Stack & Pemanfaatan MCP Terpasang
- **Framework:** **Next.js (App Router)** mode **JavaScript biasa (`--js`)**, tanpa TypeScript, dan tanpa Cache Components agar stok & status resi selalu segar.
- **Styling:** **Tailwind CSS** langsung (minim dependensi tambahan).
- **Animasi (Strategi Hybrid):** **GSAP (`gsap` + `@gsap/react` `useGSAP`) + `ScrollTrigger` + Lenis (`lenis/react`)** hanya aktif di halaman depan (`/`). Halaman transaksi (`/katalog`, `/checkout`, `/cek-pesanan`) dan `/admin` tidak memakai Lenis agar cepat di HP dan nyaman saat scroll tabel.
- **Backend, DB, Auth & Storage:** **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) untuk PostgreSQL, Auth admin, dan Storage gambar produk/bukti bayar.
- **Hosting:** **Netlify Free** (`@netlify/plugin-nextjs`) via GitHub. Dipilih karena Netlify Free mengizinkan e-commerce UMKM komersial. Budget Rp150.000/6 bulan dialokasikan murni untuk domain.
- **Catatan Supabase Free Tier:** Batas 500 MB DB & 1 GB Storage sudah cukup, namun project akan *auto-pause* jika 7 hari berturut-turut tanpa aktivitas. Jaga aktivitas rutin selama praktik dan wajib sediakan tombol **Export CSV** di dasbor admin (untuk backup ke Excel/Google Drive).

### Routing Skill & MCP Lokal (Wajib Dipakai Sebelum Bekerja)
1. **Context7 MCP (`context7`):** Wajib `resolve-library-id` + `query-docs` sebelum menulis kode integrasi/konfigurasi Next.js, Supabase, GSAP, atau Lenis (mengikuti aturan global `C:\Users\dwash\.gemini\GEMINI.md`).
2. **Netlify MCP (`netlify`):** Wajib panggil `netlify-coding-rules` sebelum membuat/mengedit fungsi serverless, edge config, atau `netlify.toml`.
3. **Chrome DevTools MCP (`chrome_devtools`):** Gunakan untuk verifikasi nyata sebelum selesai (cek console error, network request, resize mobile/tablet/desktop, screenshot, dan audit performa bila diminta; dilarang mengarang skor Lighthouse yang tidak diukur).
4. **Anti-Slop & Kualitas UI (`C:\Users\dwash\.agents\skills\`):**
   - Sebelum mendesain atau menulis UI, buat dan sepakati dulu **`DESIGN.md`** di root project (identitas visual Cimoring, palet maks. 2 sampai 3 warna inti + 1 aksen, tipografi berkarakter, serta 3 Dial: `ENERGY / RHYTHM / MOTION`).
   - Saat membangun/mengedit UI & copy, baca dan terapkan filter dari:
     - `C:\Users\dwash\.agents\skills\antislop\SKILL.md`
     - `C:\Users\dwash\.agents\skills\antislop-ui\SKILL.md`
     - `C:\Users\dwash\.agents\skills\antislop-copywriting\SKILL.md`
     - `C:\Users\dwash\.agents\skills\antislop-human\SKILL.md`
     - `C:\Users\dwash\.agents\skills\antislop-layoutmobile\SKILL.md`
     - `C:\Users\dwash\.agents\skills\antislop-code\SKILL.md`
     - `C:\Users\dwash\.gemini\config\skills\no-ai-slop\SKILL.md` (untuk audit/edit copywriting agar natural dan tidak terasa template AI).
5. **GSAP Official Skills (`C:\Users\dwash\.agents\skills\`):**
   - Wajib baca `gsap-react/SKILL.md`, `gsap-scrolltrigger/SKILL.md`, dan `gsap-performance/SKILL.md` sebelum menulis kode animasi (gunakan `useGSAP` dengan `scope`, `contextSafe`, hanya animasikan `transform` & `opacity`, hindari animasi `width/height/top/left`, dan hormati `prefers-reduced-motion`).

---

## 4. Aturan Anti-Boilerplate & Arsitektur Kode
Project ini dikerjakan oleh satu developer aktif yang baru mulai ngoding lagi. Kode harus ringkas, langsung ke inti, dan gampang dibaca ulang:

1. **Minimal Dependensi & Tanpa Overengineering:**
   - Pakai JavaScript biasa (`.js`/`.jsx`), tidak perlu TypeScript.
   - Tidak perlu Redux, Zustand, React Hook Form, Zod, atau ORM (Prisma/Drizzle). Gunakan state React secukupnya (`useState`/Context ringan untuk keranjang + `localStorage`), validasi langsung yang jelas, dan SDK Supabase resmi.
   - Tidak perlu memisahkan layer `repository/service/controller` berlebihan atau wrapper yang hanya meneruskan satu fungsi.
   - Tidak perlu mengimpor library komponen UI raksasa (seperti instalasi penuh shadcn/Radix). Bangun komponen Tailwind yang spesifik untuk CimoFood saja, dan hindari memakai satu set ikon default (seperti Lucide) di semua elemen tanpa alasan desain yang jelas (`antislop` R-04).
2. **Struktur Folder Sederhana & Modular (Siap Revisi sampai UAS):**
   - `src/app/(marketing)/` untuk halaman depan (`/`).
   - `src/app/(shop)/` untuk `/katalog`, `/checkout`, `/cek-pesanan`.
   - `src/app/admin/` untuk dasbor pengelola (desain utama responsif untuk **laptop & tablet**).
   - `src/app/reseller/` disiapkan untuk fase lanjutan/UAS.
   - `src/lib/` untuk logika murni (`supabase/`, `pricing.js`, `whatsapp.js`) terpisah dari JSX agar revisi dosen soal akad/markup/format pesan cukup diubah di satu tempat.
3. **Kebersihan Komentar Kode (`antislop-code`):**
   - Dilarang menulis banner pemisah (`// =====`), narasi langkah (`// Step 1: ...`), emoji di komentar, atau komentar yang mengulang kode yang sudah jelas.
   - Komentar hanya ditulis (maksimal 1 sampai 2 baris) untuk menjelaskan alasan bisnis/batasan teknis yang tidak terlihat dari kode.
4. **Keamanan Guest Checkout & Data Transaksi:**
   - Browser tidak boleh membaca tabel `orders` langsung lewat anon key. Pembuatan order, upload bukti bayar, dan tracking resi wajib lewat **Next.js Route Handlers (`/app/api/...`)** yang memvalidasi `order_code` + nomor WhatsApp.
   - Simpan `base_price` (harga dasar Cimoring) dan `sell_price` (harga web) secara terpisah di tabel varian, dan simpan snapshot keduanya di `order_items` saat checkout agar laporan keuangan, setoran ke mitra, dan hitungan infak 2,5% di UAS tetap akurat.
5. **Larangan Keras Anti-Slop (Ringkasan Gate):**
   - Dilarang memakai karakter em dash dalam copy UI dan teks agen (`antislop` R-02).
   - Dilarang membuat tombol/link mati tanpa aksi nyata, memakai data/angka/testimoni palsu, atau membuat layout template AI generik (bento grid tanpa alasan, dasbor 4 stat card angka fiktif, gradient biru-ungu default).
   - Setiap fitur baru menjelang UAS dikerjakan di branch Git terpisah dan dicek lewat Deploy Preview Netlify sebelum merge ke `main`.

---

## 5. Roadmap Bertahap (MVP menuju UAS)

### Fase 1: MVP (Target Minggu 1 sampai 2)
- **Landing Page (`/`):** Storytelling Cimoring sejak 2017, PIRT & Halal, showcase varian rasa, visualisasi SOP kemasan 4 lapis, CTA ke katalog (animasi GSAP + Lenis terkurasi).
- **Katalog (`/katalog`):** Filter rasa/ukuran/hampers, status stok (`Tersedia` / `Habis`), harga transparan + info packing Rp2.000.
- **Keranjang & Checkout (`/checkout`):** Pilih kurir, isi alamat, simpan order ke Supabase, kirim format order ke WhatsApp Admin.
- **Cek Pesanan & Upload Bukti (`/cek-pesanan`):** Cari kode order + no. WA, lihat status & ongkir, unggah bukti transfer/QRIS, lihat nomor resi.
- **Dasbor Admin (`/admin`):** Login aman, kelola produk & toggle stok cepat, verifikasi bukti bayar, input ongkir & nomor resi, rekap laporan penjualan harian/mingguan/bulanan + Export CSV.

### Fase 2: Tahap Lanjutan & Revisi Menuju UAS
- **Modul Reseller:** Akun reseller, kode referral unik, harga reseller tanpa minimal order, tracking target & perhitungan bonus.
- **Laporan Keuangan Lanjutan:** Rekap setoran ke Cimoring, total ujrah bersih, estimasi infak 2,5% laba bersih, grafik varian terlaris berbasis data nyata.
- **Promosi & Musiman:** Kampanye giveaway (follow IG/TikTok/Shopee), paket hampers Lebaran, ulasan pembeli nyata.

---

## 6. Aturan Kerja Agen
- Ikuti fase aktif: jangan membangun fitur Fase 2 sebelum MVP Fase 1 selesai dan teruji, kecuali diminta.
- Jangan langsung membuat aset final (logo, foto produk, ikon brand) tanpa konfirmasi/aset asli dari pengguna (`antislop` R-23); gunakan placeholder yang jelas jika belum tersedia.
- Sebelum menyatakan tugas UI selesai, wajib jalankan build/app, klik uji alur nyata (dan/atau verifikasi via Chrome DevTools MCP), lalu laporkan Delivery Gate `PASS/FAIL` dengan bukti nyata (`antislop` R-35).
