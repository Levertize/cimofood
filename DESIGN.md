# CimoFood Design Direction (`DESIGN.md`)

## Identity & Mood
- **Product:** CimoFood, website etalase dan pemesanan resmi untuk produk keripik **UMKM Cimoring** (produksi mandiri sejak 2017, berizin PIRT dan bersertifikat Halal).
- **Visual Direction:** Bersih & Terpercaya (*Modern Oleh-Oleh*). Latar terang bernuansa kertas kemasan bersih dengan teks hitam pekat, foto produk berukuran besar, satu aksen cabai merah yang tegas untuk ajakan beli, dan hijau tua untuk penanda kehalalan, keaslian PIRT, serta status aman.
- **Target Audience:** Pembeli eceran luar kota dan perantau lewat HP (Instagram, TikTok, WhatsApp), pembeli hampers musiman, calon reseller kecil, serta admin/pemilik usaha yang mengelola toko dari laptop dan tablet.
- **Identity Motif:** Garis bingkai tipis tegas berpadu sudut membulat terukur (terinspirasi kemasan kantong camilan yang tersegel rapi) dan penekanan angka harga `tabular-nums` yang jujur tanpa biaya tersembunyi.

## Dials
- **Dial (Landing Page `/`):** `ENERGY 2 / RHYTHM 3 / MOTION 3`
  - **ENERGY 2 (Balanced):** Percaya diri, hangat untuk kuliner, tidak kaku seperti situs pemerintah dan tidak berisik seperti template promosi berlebihan.
  - **RHYTHM 3 (Varied):** Komposisi antar-bagian berubah secara sengaja (hero asimetris, pita fakta, etalase varian interaktif, scrollytelling 4 lapis yang ter-pin, alur order 5 tahap, dan blok reseller berpasangan) agar terhindar dari kartu seragam berulang.
  - **MOTION 3 (Choreographed, landing only):** GSAP + ScrollTrigger + Lenis dipakai khusus untuk menghidupkan cerita produk dan SOP kemasan 4 lapis.
- **Dial (Area Belanja & Dasbor Admin):** `ENERGY 1 / RHYTHM 2 / MOTION 1`
  - Halaman `/katalog`, `/checkout`, `/cek-pesanan`, dan `/admin` tidak memuat Lenis dan membatasi animasi hanya pada feedback hover/fokus/transisi UI ringan agar transaksi HP dan pengelolaan tabel di laptop/tablet berlangsung cepat.

## Color Palette (Teruji Kontras WCAG AA)
Dibatasi 2 warna inti merek + 1 warna aksen + netral hangat (`R-29`):

- **Neutrals:**
  - Canvas Utama (Alabaster Hangat): `#FAF8F4`
  - Surface Kartu & Input: `#FFFFFF`
  - Surface Sekunder (Warm Sand): `#F2EDE4`
  - Teks Utama (Warm Espresso Black): `#171614` (rasio `17.05:1` di `#FAF8F4`, `15.51:1` di `#F2EDE4`)
  - Teks Sekunder (Warm Stone): `#57534E` (rasio `7.19:1` di `#FAF8F4`, `6.54:1` di `#F2EDE4`, `7.63:1` di `#FFFFFF`)
  - Batas Komponen Aktif / Border Input (Non-text WCAG >= 3:1): `#857D71` (rasio `3.83:1` di `#FAF8F4`, `4.06:1` di `#FFFFFF`)
  - Garis Pemisah Dekoratif Halus: `#E5DEC9` (hanya untuk pembatas pasif, tidak untuk tepi tombol/input interaktif)
- **Core Brand Colors (2 Inti):**
  - **Halal Forest (`#1F4E3D`):** Penanda kepercayaan PIRT/Halal dan status sukses/dibayar (teks putih di atasnya `9.48:1`; teks `#1F4E3D` di atas `#FAF8F4` `8.94:1`).
  - **Golden Crunch (`#B45309` untuk latar tombol/badge teks putih `5.02:1`, `#9A4206` untuk teks di atas `#FAF8F4` `6.27:1`):** Penanda keemasan keripik renyah dan status menunggu konfirmasi/verifikasi.
- **Deliberate Single Accent (1 Aksen):**
  - **Chili Terracotta (`#C83E2B` default dengan teks putih `5.02:1`; `#B33220` untuk state hover dan teks aksen di atas `#FAF8F4` `5.83:1`):** Dipakai khusus pada CTA utama pembelian, indikator jumlah keranjang, dan sorotan rasa pedas.
- **Theme Mode:** Light mode tetap (*fixed light*), dipilih karena warna terang bersih lebih menggugah selera untuk produk makanan kemasan dan memudahkan pembacaan di layar HP saat siang hari (`R-21`).

## Typography (`R-06`)
- **Display / Headings:** **`Fraunces`** (via `next/font/google`). Serif modern berkarakter lembut dan organik yang cocok dengan citra camilan tradisional sejak 2017 yang dikemas modern, sekaligus jauh dari font SaaS standar AI.
- **Body, Form, & UI Tables:** **`Plus Jakarta Sans`** (via `next/font/google`). Keterbacaan sangat baik untuk teks bahasa Indonesia di layar HP dan laptop, dengan fitur `tabular-nums` pada nominal Rupiah, berat gram, dan kode pesanan.

## Surface, Radius, Shadow & Motion Discipline
- **Border Radius (`R-11`):** Skala terukur: `rounded-md` (6px) untuk input dan kontrol admin, `rounded-xl` (12px) untuk kartu produk dan panel konten, `rounded-full` hanya untuk tombol CTA utama atau penanda status fungsional kecil.
- **Shadow & Glass (`R-10`, `R-12`, `R-13`):** Sebagian besar elemen duduk rata (`border` tipis dan perbedaan surface `#FFFFFF` vs `#FAF8F4`). Bayangan halus hanya dipakai pada drawer keranjang, modal verifikasi, dan kartu fokus aktif. Tidak menggunakan glow dekoratif dan membatasi efek blur maksimal 1 elemen (seperti header lengket ringan) atau nol sama sekali.
- **Icons (`R-04`):** Hindari menaruh ikon dekoratif di setiap heading atau kartu. Gunakan ikon SVG khusus/sederhana hanya untuk fungsi yang membantu (ikon keranjang, ikon WhatsApp pada tombol konfirmasi, panah arah pada link tertentu, dan indikator menu mobile).
- **Motion Rules (`R-19`, `R-40`):**
  - Animasi GSAP hanya menggerakkan `transform` (`x`, `y`, `scale`, `rotate`) dan `opacity`.
  - Tidak ada animasi loop tanpa henti.
  - Seluruh animasi non-esensial wajib berhenti jika pengguna mengaktifkan `prefers-reduced-motion: reduce`.
  - Gambar hero dimuat sebagai `<img>` dengan dimensi eksplisit dan `fetchpriority="high"` tanpa `loading="lazy"`.

## Placeholder & Asset Policy (`R-23`, `R-38`)
- Sebelum foto produk asli dan logo diterima dari tim/mitra:
  - Logo memakai typographic wordmark **CimoFood** dengan huruf `Fraunces` tebal (tanpa mengarang ilustrasi maskot palsu).
  - Area gambar memakai kotak placeholder rapi dengan rasio terkunci dan label jelas seperti `[FOTO PRODUK ASLI: PEDAS 250G]` atau `[FOTO PROSES PACKING 4 LAPIS]`.
  - Nomor registrasi PIRT/Halal, nomor WhatsApp, dan QRIS memakai label `[DATA MITRA PENDING]` sampai data asli dimasukkan.
