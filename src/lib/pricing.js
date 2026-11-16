export function formatRupiah(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function normalizeWhatsapp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function generateOrderCode() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CF-${y}${m}${d}-${rand}`;
}

export function buildOrderConfirmationText(order) {
  const itemLines = (order.items || [])
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.product_name} (${item.size_label}) x${item.quantity} = ${formatRupiah(
          item.unit_sell_price * item.quantity
        )}`
    )
    .join("\n");

  const lines = [
    `Halo Admin CimoFood, saya mau konfirmasi stok dan ongkir pesanan:`,
    `Kode Order: ${order.order_code}`,
    `Nama: ${order.customer_name}`,
    `WhatsApp: ${order.customer_whatsapp}`,
    `Alamat: ${order.shipping_address}`,
    `Kurir Pilihan: ${order.courier}`,
    "",
    "Rincian Produk:",
    itemLines,
    "",
    `Subtotal Produk: ${formatRupiah(order.subtotal_sell)}`,
    `Biaya Packing Aman: ${formatRupiah(order.packing_fee)}`,
    order.notes ? `Catatan: ${order.notes}` : null,
    "",
    "Mohon info ketersediaan stok dan total ongkirnya ya, terima kasih.",
  ].filter((line) => line !== null);

  return lines.join("\n");
}

export function buildWhatsAppOrderUrl(order, adminWhatsapp) {
  const cleanAdmin = normalizeWhatsapp(adminWhatsapp);
  if (!cleanAdmin) return null;
  const text = buildOrderConfirmationText(order);
  return `https://wa.me/${cleanAdmin}?text=${encodeURIComponent(text)}`;
}

export function calculateSalesSummary(orders) {
  const valid = (orders || []).filter((o) => o.status !== "dibatalkan");
  const completed = valid.filter((o) =>
    ["dibayar", "dikemas", "dikirim", "selesai"].includes(o.status)
  );

  let grossRevenue = 0;
  let totalBaseDueToCimoring = 0;
  let totalPackingCollected = 0;

  for (const order of completed) {
    grossRevenue += Number(order.total_amount || 0);
    totalBaseDueToCimoring += Number(order.subtotal_base || 0);
    totalPackingCollected += Number(order.packing_fee || 0);
  }

  const totalShipping = completed.reduce(
    (sum, o) => sum + Number(o.shipping_cost || 0),
    0
  );
  // Ujrah bersih = harga jual produk dikurangi setoran harga dasar ke Cimoring
  const totalUjrahGross = completed.reduce(
    (sum, o) => sum + Math.max(0, Number(o.subtotal_sell || 0) - Number(o.subtotal_base || 0)),
    0
  );

  return {
    totalOrders: valid.length,
    paidOrdersCount: completed.length,
    grossRevenue,
    totalBaseDueToCimoring,
    totalUjrahGross,
    totalPackingCollected,
    totalShipping,
  };
}

export function ordersToCsv(orders) {
  const headers = [
    "Kode Order",
    "Tanggal",
    "Nama Pembeli",
    "WhatsApp",
    "Kurir",
    "Status",
    "Subtotal Jual",
    "Harga Dasar Cimoring",
    "Ujrah Kotor",
    "Biaya Packing",
    "Ongkir",
    "Total Bayar",
    "No Resi",
    "Kode Referral",
  ];

  const escapeCsv = (val) => {
    const str = String(val ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = (orders || []).map((o) => {
    const ujrah = Number(o.subtotal_sell || 0) - Number(o.subtotal_base || 0);
    return [
      o.order_code,
      o.created_at,
      o.customer_name,
      o.customer_whatsapp,
      o.courier,
      o.status,
      o.subtotal_sell,
      o.subtotal_base,
      ujrah,
      o.packing_fee,
      o.shipping_cost,
      o.total_amount,
      o.tracking_number || "",
      o.referral_code || "",
    ]
      .map(escapeCsv)
      .join(",");
  });

  return [headers.map(escapeCsv).join(","), ...rows].join("\n");
}
