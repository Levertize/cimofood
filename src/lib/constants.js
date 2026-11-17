export const COURIERS = [
  {
    id: "Mandiri/Lokal",
    label: "Pengiriman Mandiri / Lokal",
    badge: "Area Dekat",
    eta: "Hari ini - 1 hari",
    description: "Diantar langsung untuk area sekitar tanpa lewat gudang sortir.",
  },
  {
    id: "J&T",
    label: "J&T Express",
    badge: "Reguler Cepat",
    eta: "1 - 3 hari kerja",
    description: "Jaringan luas dengan tracking resi real-time nasional.",
  },
  {
    id: "JNE",
    label: "JNE Reguler / YES",
    badge: "Seluruh Indonesia",
    eta: "2 - 4 hari kerja",
    description: "Cocok untuk pengiriman paket berat atau luar pulau.",
  },
  {
    id: "Anteraja",
    label: "Anteraja",
    badge: "Hemat & Terjadwal",
    eta: "2 - 4 hari kerja",
    description: "Pilihan ekonomis dengan pickup kurir langsung.",
  },
];

export const PAYMENT_METHODS = [
  {
    id: "midtrans_auto",
    label: "Bayar Otomatis (QRIS Instan, VA Bank, E-Wallet)",
    badge: "Rekomendasi",
    description:
      "Pembayaran otomatis via Midtrans Snap setelah ongkos kirim dikonfirmasi admin. Status langsung masuk Sedang Dikemas tanpa perlu upload bukti manual.",
  },
  {
    id: "manual_transfer",
    label: "Transfer Bank / Scan QRIS Toko (Manual)",
    badge: "Alternatif",
    description:
      "Transfer ke rekening resmi CimoFood atau scan QRIS toko di halaman Cek Pesanan, lalu unggah foto bukti transfer untuk dicek admin.",
  },
];

export const ORDER_STATUS_META = {
  menunggu_konfirmasi: {
    label: "Menunggu Konfirmasi Stok & Ongkir",
    shortLabel: "Cek Ongkir",
    tone: "amber",
  },
  menunggu_pembayaran: {
    label: "Menunggu Pembayaran",
    shortLabel: "Siap Dibayar",
    tone: "amber",
  },
  verifikasi_bayar: {
    label: "Bukti Transfer Dicek Admin",
    shortLabel: "Cek Bukti",
    tone: "amber",
  },
  dibayar: {
    label: "Pembayaran Lunas, Siap Dikemas",
    shortLabel: "Lunas",
    tone: "green",
  },
  dikemas: {
    label: "Sedang Dikemas (SOP 4 Lapis)",
    shortLabel: "Sedang Dikemas",
    tone: "green",
  },
  dikirim: {
    label: "Diserahkan ke Kurir & Dalam Perjalanan",
    shortLabel: "Dalam Perjalanan",
    tone: "green",
  },
  selesai: {
    label: "Selesai (Pesanan Diterima Pembeli)",
    shortLabel: "Selesai",
    tone: "green",
  },
  dibatalkan: {
    label: "Pesanan Dibatalkan",
    shortLabel: "Dibatalkan",
    tone: "red",
  },
};

export const ORDER_FLOW_STEPS = [
  "menunggu_konfirmasi",
  "menunggu_pembayaran",
  "dikemas",
  "dikirim",
  "selesai",
];

export const ADMIN_ORDER_STATUS_OPTIONS = [
  "menunggu_konfirmasi",
  "menunggu_pembayaran",
  "dikemas",
  "dikirim",
  "selesai",
  "dibatalkan",
];

/**
 * Maps any database order status (including legacy intermediate statuses) to the 5-step visual index.
 */
export function getOrderFlowStepIndex(status) {
  if (status === "verifikasi_bayar") return 1;
  if (status === "dibayar") return 2;
  return ORDER_FLOW_STEPS.indexOf(status);
}

export const PACKING_LAYERS = [
  {
    step: "01",
    title: "Segel Rapat Mesin Sealer",
    detail:
      "Kantong plastik disegel ulang dengan mesin pemanas snack agar keripik tetap renyah selama perjalanan luar kota.",
  },
  {
    step: "02",
    title: "Apit Kardus Kanan dan Kiri",
    detail:
      "Dua lembar kardus kaku menahan sisi kemasan. Untuk varian original yang plastiknya lebih tipis karena tanpa bumbu, tekanan dibuat lebih ringan agar tidak terbuka.",
  },
  {
    step: "03",
    title: "Lapisan Kardus Melingkar",
    detail:
      "Bagian dalam paket dilapisi kardus memutar untuk meredam benturan saat paket ditumpuk di gudang ekspedisi.",
  },
  {
    step: "04",
    title: "Bubble Wrap dan Foto Bukti",
    detail:
      "Pembungkus luar memakai bubble wrap dan difoto sebelum diserahkan ke kurir. Biaya packing Rp2.000 per pesanan ditampilkan apa adanya di checkout.",
  },
];

export const INITIAL_SITE_SETTINGS = {
  id: 1,
  admin_whatsapp: "",
  bank_info: "Transfer Bank & QRIS Resmi CimoFood",
  qris_image_url: null,
  packing_fee: 2000,
  pirt_number: "Terdaftar Dinas Kesehatan",
  halal_number: "Tersertifikasi Halal",
};

export const INITIAL_PRODUCTS = [
  {
    id: "prod-pedas",
    slug: "pedas",
    name: "Cimoring Pedas",
    category: "varian",
    description: "Keripik aci renyah dengan baluran bumbu cabai pedas gurih.",
    image_url: "/images/cimoring-pedas.jpg",
    is_active: true,
    sort_order: 1,
    variants: [
      { id: "var-pedas-200", product_id: "prod-pedas", size_label: "200 g", weight_grams: 200, base_price: 10000, sell_price: 12500, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-pedas-250", product_id: "prod-pedas", size_label: "250 g", weight_grams: 250, base_price: 15000, sell_price: 18000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-pedas-500", product_id: "prod-pedas", size_label: "500 g", weight_grams: 500, base_price: 20000, sell_price: 24000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-pedas-2000", product_id: "prod-pedas", size_label: "Bal 2 kg", weight_grams: 2000, base_price: 45000, sell_price: 49500, shopee_price: null, is_available: true, stock_note: "" },
    ],
  },
  {
    id: "prod-balado",
    slug: "balado",
    name: "Cimoring Balado",
    category: "varian",
    description: "Bumbu balado manis pedas yang akrab untuk camilan harian atau oleh-oleh.",
    image_url: "/images/cimoring-balado.jpg",
    is_active: true,
    sort_order: 2,
    variants: [
      { id: "var-balado-200", product_id: "prod-balado", size_label: "200 g", weight_grams: 200, base_price: 10000, sell_price: 12500, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-balado-250", product_id: "prod-balado", size_label: "250 g", weight_grams: 250, base_price: 15000, sell_price: 18000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-balado-500", product_id: "prod-balado", size_label: "500 g", weight_grams: 500, base_price: 20000, sell_price: 24000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-balado-2000", product_id: "prod-balado", size_label: "Bal 2 kg", weight_grams: 2000, base_price: 45000, sell_price: 49500, shopee_price: null, is_available: true, stock_note: "" },
    ],
  },
  {
    id: "prod-original",
    slug: "original",
    name: "Cimoring Original",
    category: "varian",
    description: "Gurih murni tanpa bumbu tabur. Dikemas dengan tekanan kardus lebih ringan agar kantong tetap rapat.",
    image_url: "/images/cimoring-original.jpg",
    is_active: true,
    sort_order: 3,
    variants: [
      { id: "var-orig-200", product_id: "prod-original", size_label: "200 g", weight_grams: 200, base_price: 10000, sell_price: 12500, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-orig-250", product_id: "prod-original", size_label: "250 g", weight_grams: 250, base_price: 15000, sell_price: 18000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-orig-500", product_id: "prod-original", size_label: "500 g", weight_grams: 500, base_price: 20000, sell_price: 24000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-orig-2000", product_id: "prod-original", size_label: "Bal 2 kg", weight_grams: 2000, base_price: 45000, sell_price: 49500, shopee_price: null, is_available: true, stock_note: "" },
    ],
  },
  {
    id: "prod-barbecue",
    slug: "barbecue",
    name: "Cimoring Barbecue",
    category: "varian",
    description: "Rasa panggang manis gurih dengan aroma smokey ringan untuk semua usia.",
    image_url: "/images/cimoring-barbecue.jpg",
    is_active: true,
    sort_order: 4,
    variants: [
      { id: "var-bbq-200", product_id: "prod-barbecue", size_label: "200 g", weight_grams: 200, base_price: 10000, sell_price: 12500, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-bbq-250", product_id: "prod-barbecue", size_label: "250 g", weight_grams: 250, base_price: 15000, sell_price: 18000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-bbq-500", product_id: "prod-barbecue", size_label: "500 g", weight_grams: 500, base_price: 20000, sell_price: 24000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-bbq-2000", product_id: "prod-barbecue", size_label: "Bal 2 kg", weight_grams: 2000, base_price: 45000, sell_price: 49500, shopee_price: null, is_available: true, stock_note: "" },
    ],
  },
  {
    id: "prod-balado-asin",
    slug: "balado-asin",
    name: "Cimoring Balado Asin",
    category: "varian",
    description: "Kombinasi balado ringan dan rasa asin gurih yang seimbang.",
    image_url: "/images/cimoring-balado-asin.jpg",
    is_active: true,
    sort_order: 5,
    variants: [
      { id: "var-ba-200", product_id: "prod-balado-asin", size_label: "200 g", weight_grams: 200, base_price: 10000, sell_price: 12500, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-ba-250", product_id: "prod-balado-asin", size_label: "250 g", weight_grams: 250, base_price: 15000, sell_price: 18000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-ba-500", product_id: "prod-balado-asin", size_label: "500 g", weight_grams: 500, base_price: 20000, sell_price: 24000, shopee_price: null, is_available: true, stock_note: "" },
      { id: "var-ba-2000", product_id: "prod-balado-asin", size_label: "Bal 2 kg", weight_grams: 2000, base_price: 45000, sell_price: 49500, shopee_price: null, is_available: true, stock_note: "" },
    ],
  },
  {
    id: "prod-varian-6",
    slug: "varian-6-pending",
    name: "[Varian ke-6: Konfirmasi Mitra]",
    category: "varian",
    description: "Slot varian ke-6 menunggu konfirmasi nama rasa dan harga dasar resmi dari UMKM Cimoring.",
    image_url: "/placeholders/product-placeholder.svg",
    is_active: false,
    sort_order: 6,
    variants: [
      { id: "var-6-250", product_id: "prod-varian-6", size_label: "250 g", weight_grams: 250, base_price: 15000, sell_price: 18000, shopee_price: null, is_available: false, stock_note: "Menunggu konfirmasi mitra" },
    ],
  },
  {
    id: "prod-hampers",
    slug: "hampers-lebaran",
    name: "Paket Hampers Cimoring",
    category: "hampers",
    description: "Paket bundling isi pilihan varian dalam kemasan hadiah rapi dan kartu ucapan untuk oleh-oleh atau Lebaran.",
    image_url: "/images/cimoring-hampers.jpg",
    is_active: true,
    sort_order: 7,
    variants: [
      { id: "var-hampers-3", product_id: "prod-hampers", size_label: "Bundling 3 Rasa", weight_grams: 750, base_price: 60000, sell_price: 78000, shopee_price: null, is_available: true, stock_note: "" },
    ],
  },
];
