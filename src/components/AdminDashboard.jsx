"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_ORDER_STATUS_OPTIONS, ORDER_STATUS_META } from "@/lib/constants";
import {
  calculateSalesSummary,
  formatRupiah,
  normalizeWhatsapp,
  ordersToCsv,
} from "@/lib/pricing";

const ORDER_TABS = [
  { id: "semua", label: "Semua" },
  { id: "cek_ongkir", label: "Cek Ongkir" },
  { id: "menunggu_bayar", label: "Menunggu Bayar" },
  { id: "dikemas", label: "Sedang Dikemas" },
  { id: "selesai_kirim", label: "Dikirim & Selesai" },
];

export function AdminDashboard({
  initialOrders,
  initialProducts,
  initialSettings,
  backendStatus,
  adminEmail,
  isPreviewMode,
}) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("orders");
  const [orders, setOrders] = useState(initialOrders || []);
  const [products, setProducts] = useState(initialProducts || []);
  const [settings, setSettings] = useState(initialSettings);

  const [orderFilter, setOrderFilter] = useState("semua");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editShipping, setEditShipping] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTracking, setEditTracking] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [variantDrafts, setVariantDrafts] = useState({});
  const [savingVariantId, setSavingVariantId] = useState("");

  const [reportRange, setReportRange] = useState("semua");
  const [reportNow, setReportNow] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);

  const [qrisFile, setQrisFile] = useState(null);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [packingFile, setPackingFile] = useState(null);
  const [uploadingPacking, setUploadingPacking] = useState(false);
  const [drawerFeedback, setDrawerFeedback] = useState("");
  const [drawerError, setDrawerError] = useState("");

  const modalRef = useRef(null);
  const qrisInputRef = useRef(null);
  const packingInputRef = useRef(null);

  useEffect(() => {
    if (!selectedOrder) return;
    function onKey(e) {
      if (e.key === "Escape") setSelectedOrder(null);
    }
    window.addEventListener("keydown", onKey);
    modalRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedOrder]);

  function openOrderDrawer(order) {
    setSelectedOrder(order);
    setEditShipping(String(order.shipping_cost ?? 0));
    setEditStatus(order.status);
    setEditTracking(order.tracking_number || "");
    setPackingFile(null);
    if (packingInputRef.current) packingInputRef.current.value = "";
    setDrawerFeedback("");
    setDrawerError("");
    setErrorMsg("");
    setFeedback("");
  }

  async function persistOrderUpdate(nextStatus = editStatus) {
    if (!selectedOrder) return;
    setSavingOrder(true);
    setErrorMsg("");
    setFeedback("");
    setDrawerFeedback("");
    setDrawerError("");

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          shipping_cost: Number(editShipping || 0),
          status: nextStatus,
          tracking_number: editTracking,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui pesanan.");

      const updated = {
        ...data.order,
        payment_proof_signed_url:
          data.order.payment_proof_signed_url ??
          selectedOrder.payment_proof_signed_url,
        packing_proof_signed_url:
          data.order.packing_proof_signed_url ??
          selectedOrder.packing_proof_signed_url,
      };
      setEditStatus(updated.status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSelectedOrder(updated);
      const msg = `Pesanan ${updated.order_code} diperbarui.`;
      setDrawerFeedback(msg);
      setFeedback(msg);
    } catch (err) {
      setDrawerError(err.message);
      setErrorMsg(err.message);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleSaveOrder(e) {
    e.preventDefault();
    await persistOrderUpdate(editStatus);
  }

  async function handleUploadPackingProof() {
    if (!selectedOrder || !packingFile) return;
    setUploadingPacking(true);
    setDrawerError("");
    setDrawerFeedback("");
    setErrorMsg("");
    setFeedback("");
    try {
      const formData = new FormData();
      formData.append("orderId", selectedOrder.id);
      formData.append("proof", packingFile);

      const res = await fetch("/api/admin/orders/packing-proof", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto packing.");

      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
      setSelectedOrder(data.order);
      setPackingFile(null);
      if (packingInputRef.current) packingInputRef.current.value = "";
      const msg = `Foto bukti packing 4 lapis untuk ${data.order.order_code} berhasil diunggah.`;
      setDrawerFeedback(msg);
      setFeedback(msg);
    } catch (err) {
      setDrawerError(err.message);
    } finally {
      setUploadingPacking(false);
    }
  }

  async function handleRemovePackingProof() {
    if (!selectedOrder?.packing_proof_signed_url) return;
    setUploadingPacking(true);
    setDrawerError("");
    setDrawerFeedback("");
    try {
      const res = await fetch(
        `/api/admin/orders/packing-proof?orderId=${encodeURIComponent(
          selectedOrder.id
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus foto packing.");

      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
      setSelectedOrder(data.order);
      const msg = `Foto bukti packing ${data.order.order_code} dihapus.`;
      setDrawerFeedback(msg);
      setFeedback(msg);
    } catch (err) {
      setDrawerError(err.message);
    } finally {
      setUploadingPacking(false);
    }
  }

  async function handleToggleAvailability(variant) {
    setSavingVariantId(variant.id);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          is_available: !variant.is_available,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah stok.");

      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: (p.variants || []).map((v) =>
            v.id === variant.id ? data.variant : v
          ),
        }))
      );
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingVariantId("");
    }
  }

  async function handleSaveVariantPrice(variant) {
    const draft = variantDrafts[variant.id];
    if (!draft) return;
    setSavingVariantId(variant.id);
    setErrorMsg("");
    setFeedback("");

    try {
      const res = await fetch("/api/admin/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          base_price: draft.base_price ?? variant.base_price,
          sell_price: draft.sell_price ?? variant.sell_price,
          shopee_price: draft.shopee_price ?? variant.shopee_price,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan harga.");

      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: (p.variants || []).map((v) =>
            v.id === variant.id ? data.variant : v
          ),
        }))
      );
      setFeedback(`Harga varian ${variant.size_label} diperbarui.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingVariantId("");
    }
  }

  async function handleToggleProductActive(product) {
    setSavingVariantId(product.id);
    setErrorMsg("");
    setFeedback("");
    try {
      const res = await fetch("/api/admin/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          is_active: !product.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status produk.");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_active: data.product.is_active } : p
        )
      );
      setFeedback(
        `${product.name} kini ${
          data.product.is_active ? "tampil di toko" : "disembunyikan (draft)"
        }.`
      );
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingVariantId("");
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setErrorMsg("");
    setFeedback("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_whatsapp: settings?.admin_whatsapp || "",
          bank_info: settings?.bank_info || "",
          packing_fee: settings?.packing_fee ?? 2000,
          pirt_number: settings?.pirt_number || "",
          halal_number: settings?.halal_number || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan.");
      setSettings(data.settings);
      setFeedback("Pengaturan toko berhasil disimpan.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleUploadQris() {
    if (!qrisFile) return;
    setUploadingQris(true);
    setErrorMsg("");
    setFeedback("");
    try {
      const formData = new FormData();
      formData.append("qris", qrisFile);

      const res = await fetch("/api/admin/settings/qris", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah gambar QRIS.");
      setSettings(data.settings);
      setQrisFile(null);
      if (qrisInputRef.current) qrisInputRef.current.value = "";
      setFeedback("Gambar QRIS resmi CimoFood berhasil diunggah.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingQris(false);
    }
  }

  async function handleRemoveQris() {
    if (!settings?.qris_image_url) return;
    setUploadingQris(true);
    setErrorMsg("");
    setFeedback("");
    try {
      const res = await fetch("/api/admin/settings/qris", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus gambar QRIS.");
      setSettings(data.settings);
      setFeedback("Gambar QRIS resmi toko dihapus.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingQris(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === "semua") return true;
      if (orderFilter === "cek_ongkir")
        return o.status === "menunggu_konfirmasi";
      if (orderFilter === "menunggu_bayar")
        return ["menunggu_pembayaran", "verifikasi_bayar"].includes(o.status);
      if (orderFilter === "dikemas")
        return ["dibayar", "dikemas"].includes(o.status);
      if (orderFilter === "selesai_kirim")
        return ["dikirim", "selesai"].includes(o.status);
      return true;
    });
  }, [orders, orderFilter]);

  const reportOrders = useMemo(() => {
    if (reportRange === "semua" || !reportNow) return orders;
    const days = reportRange === "hari" ? 1 : reportRange === "minggu" ? 7 : 30;
    const cutoff = reportNow - days * 24 * 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }, [orders, reportRange, reportNow]);

  const summary = useMemo(
    () => calculateSalesSummary(reportOrders),
    [reportOrders]
  );

  function handleDownloadCsv() {
    const csv = ordersToCsv(reportOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-cimofood-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-subtle bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-xl font-bold text-ink">
              CimoFood Admin
            </Link>
            <span className="hidden sm:inline text-xs text-muted">
              {adminEmail}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "orders", label: "Antrean Pesanan" },
              { id: "stock", label: "Stok & Harga" },
              { id: "reports", label: "Rekap & Pengaturan" },
            ].map((tab) => {
              const active = activeNav === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(tab.id);
                    setFeedback("");
                    setErrorMsg("");
                  }}
                  className={`min-h-11 rounded-md px-4 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-ink text-canvas"
                      : "border border-control bg-canvas text-ink hover:bg-sand"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-11 rounded-md border border-control bg-surface px-4 text-sm font-semibold text-chili-hover hover:bg-sand"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {isPreviewMode && (
          <div className="rounded-xl border border-amber-bg bg-sand px-4 py-3 text-sm text-ink">
            <strong>Mode Preview Lokal:</strong> Data pesanan dan stok saat ini
            disimpan di penyimpanan lokal sementara. Sambungkan kredensial
            Supabase di <code>.env.local</code> sebelum toko resmi dibuka.
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className="rounded-xl border border-forest bg-surface px-4 py-3 text-sm font-medium text-forest"
          >
            {feedback}
          </div>
        )}
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-chili bg-surface px-4 py-3 text-sm font-medium text-chili-hover"
          >
            {errorMsg}
          </div>
        )}

        {activeNav === "orders" && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h1 className="font-display text-2xl font-bold text-ink">
                Antrean Pesanan ({filteredOrders.length})
              </h1>

              <div className="flex flex-wrap gap-2">
                {ORDER_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setOrderFilter(t.id)}
                    className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold ${
                      orderFilter === t.id
                        ? "border-ink bg-sand text-ink"
                        : "border-control bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-subtle bg-surface p-8 text-center">
                <p className="font-semibold text-ink">
                  Belum ada pesanan di antrean ini.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Pesanan baru dari halaman checkout akan muncul otomatis di
                  sini untuk dikonfirmasi ongkir dan pembayarannya.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-subtle bg-surface">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-subtle bg-sand text-xs font-semibold text-ink">
                    <tr>
                      <th className="px-4 py-3.5">Kode &amp; Tanggal</th>
                      <th className="px-4 py-3.5">Pembeli &amp; Kurir</th>
                      <th className="px-4 py-3.5">Rincian Item</th>
                      <th className="px-4 py-3.5">Total + Ongkir</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {filteredOrders.map((order) => {
                      const meta = ORDER_STATUS_META[order.status] || {
                        shortLabel: order.status,
                        tone: "amber",
                      };
                      return (
                        <tr key={order.id} className="hover:bg-canvas">
                          <td className="px-4 py-3.5 align-top">
                            <p className="font-bold text-ink tabular-nums">
                              {order.order_code}
                            </p>
                            <p className="text-xs text-muted tabular-nums">
                              {new Date(order.created_at).toLocaleDateString(
                                "id-ID"
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <p className="font-semibold text-ink">
                              {order.customer_name}
                            </p>
                            <p className="text-xs text-muted">
                              WA: {order.customer_whatsapp} | {order.courier}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <ul className="space-y-0.5 text-xs text-ink">
                              {(order.items || []).map((it, idx) => (
                                <li key={it.id || idx}>
                                  {it.product_name} ({it.size_label}) x
                                  {it.quantity}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums">
                            <p className="font-bold text-ink">
                              {formatRupiah(order.total_amount)}
                            </p>
                            <p className="text-xs text-muted">
                              Ongkir: {formatRupiah(order.shipping_cost)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                meta.tone === "green"
                                  ? "bg-forest text-white"
                                  : meta.tone === "red"
                                  ? "bg-chili text-white"
                                  : "bg-amber-bg text-white"
                              }`}
                            >
                              {meta.shortLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-top text-right">
                            <button
                              type="button"
                              onClick={() => openOrderDrawer(order)}
                              className="min-h-11 rounded-md border border-control bg-canvas px-3.5 text-xs font-semibold text-ink hover:bg-sand"
                            >
                              Proses Order
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeNav === "stock" && (
          <section className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">
                Manajemen Stok &amp; Kontrol Harga Shopee
              </h1>
              <p className="mt-1 text-sm text-muted">
                Ketuk tombol status untuk langsung menandai varian Tersedia atau
                Habis. Sistem akan memberi peringatan bila harga jual web
                melebihi harga pembanding Shopee.
              </p>
            </div>

            <div className="space-y-5">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-subtle bg-surface p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-xl font-bold text-ink">
                        {product.name}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          product.is_active
                            ? "bg-forest text-white"
                            : "border border-control bg-sand text-muted"
                        }`}
                      >
                        {product.is_active ? "Tampil di Toko" : "Draft"}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={savingVariantId === product.id}
                      onClick={() => handleToggleProductActive(product)}
                      className="min-h-11 rounded-full border border-control bg-canvas px-4 text-xs font-semibold text-ink hover:bg-sand disabled:opacity-60"
                    >
                      {product.is_active
                        ? "Sembunyikan dari Toko"
                        : "Tampilkan di Toko"}
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-subtle text-xs font-semibold text-muted">
                        <tr>
                          <th className="py-2.5 pr-3">Ukuran</th>
                          <th className="py-2.5 px-3">Harga Dasar Cimoring</th>
                          <th className="py-2.5 px-3">Harga Jual Web</th>
                          <th className="py-2.5 px-3">Harga Shopee</th>
                          <th className="py-2.5 px-3">Status Stok</th>
                          <th className="py-2.5 pl-3 text-right">Simpan Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {(product.variants || []).map((v) => {
                          const draft = variantDrafts[v.id] || {};
                          const sellVal = Number(
                            draft.sell_price ?? v.sell_price
                          );
                          const shopeeVal =
                            draft.shopee_price !== undefined
                              ? draft.shopee_price === ""
                                ? null
                                : Number(draft.shopee_price)
                              : v.shopee_price;
                          const overShopee =
                            shopeeVal !== null &&
                            shopeeVal > 0 &&
                            sellVal > shopeeVal;

                          return (
                            <tr key={v.id}>
                              <td className="py-3 pr-3 font-semibold text-ink">
                                {v.size_label}
                              </td>
                              <td className="py-3 px-3">
                                <label
                                  htmlFor={`base-${v.id}`}
                                  className="sr-only"
                                >
                                  Harga dasar {product.name} {v.size_label}
                                </label>
                                <input
                                  id={`base-${v.id}`}
                                  type="number"
                                  min="0"
                                  value={draft.base_price ?? v.base_price}
                                  onChange={(e) =>
                                    setVariantDrafts((prev) => ({
                                      ...prev,
                                      [v.id]: {
                                        ...prev[v.id],
                                        base_price: e.target.value,
                                      },
                                    }))
                                  }
                                  className="min-h-11 w-32 rounded-md border border-control bg-canvas px-2.5 text-sm tabular-nums"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <label
                                  htmlFor={`sell-${v.id}`}
                                  className="sr-only"
                                >
                                  Harga jual {product.name} {v.size_label}
                                </label>
                                <input
                                  id={`sell-${v.id}`}
                                  type="number"
                                  min="0"
                                  value={draft.sell_price ?? v.sell_price}
                                  onChange={(e) =>
                                    setVariantDrafts((prev) => ({
                                      ...prev,
                                      [v.id]: {
                                        ...prev[v.id],
                                        sell_price: e.target.value,
                                      },
                                    }))
                                  }
                                  className="min-h-11 w-32 rounded-md border border-control bg-canvas px-2.5 text-sm tabular-nums"
                                />
                                {overShopee && (
                                  <p className="mt-1 text-xs font-semibold text-chili-hover">
                                    Melebihi harga Shopee
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <label
                                  htmlFor={`shopee-${v.id}`}
                                  className="sr-only"
                                >
                                  Harga Shopee {product.name} {v.size_label}
                                </label>
                                <input
                                  id={`shopee-${v.id}`}
                                  type="number"
                                  min="0"
                                  placeholder="Opsional"
                                  value={
                                    draft.shopee_price ?? v.shopee_price ?? ""
                                  }
                                  onChange={(e) =>
                                    setVariantDrafts((prev) => ({
                                      ...prev,
                                      [v.id]: {
                                        ...prev[v.id],
                                        shopee_price: e.target.value,
                                      },
                                    }))
                                  }
                                  className="min-h-11 w-32 rounded-md border border-control bg-canvas px-2.5 text-sm tabular-nums"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  disabled={savingVariantId === v.id}
                                  onClick={() => handleToggleAvailability(v)}
                                  className={`min-h-11 rounded-full px-4 text-xs font-semibold ${
                                    v.is_available
                                      ? "bg-forest text-white"
                                      : "border border-control bg-sand text-ink"
                                  }`}
                                >
                                  {v.is_available ? "Tersedia" : "Habis"}
                                </button>
                              </td>
                              <td className="py-3 pl-3 text-right">
                                <button
                                  type="button"
                                  disabled={
                                    !variantDrafts[v.id] ||
                                    savingVariantId === v.id
                                  }
                                  onClick={() => handleSaveVariantPrice(v)}
                                  className="min-h-11 rounded-md border border-control bg-canvas px-3.5 text-xs font-semibold text-ink hover:bg-sand disabled:opacity-50"
                                >
                                  Simpan
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeNav === "reports" && (
          <div className="grid gap-8 lg:grid-cols-12">
            <section className="lg:col-span-7 space-y-5 rounded-2xl border border-subtle bg-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-2xl font-bold text-ink">
                  Rekap Penjualan &amp; Keuangan
                </h1>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "hari", label: "24 Jam" },
                    { id: "minggu", label: "7 Hari" },
                    { id: "bulan", label: "30 Hari" },
                    { id: "semua", label: "Semua" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setReportRange(r.id);
                        setReportNow(Date.now());
                      }}
                      className={`min-h-11 rounded-md border px-3 text-xs font-semibold ${
                        reportRange === r.id
                          ? "border-ink bg-ink text-canvas"
                          : "border-control bg-canvas text-ink"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-subtle bg-canvas p-4">
                  <dt className="text-xs text-muted">
                    Pesanan Lunas / Diproses (dari {summary.totalOrders} order)
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-ink tabular-nums">
                    {summary.paidOrdersCount} pesanan
                  </dd>
                </div>
                <div className="rounded-xl border border-subtle bg-canvas p-4">
                  <dt className="text-xs text-muted">
                    Total Nilai Masuk (Omzet + Ongkir)
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-ink tabular-nums">
                    {formatRupiah(summary.grossRevenue)}
                  </dd>
                </div>
                <div className="rounded-xl border border-subtle bg-canvas p-4">
                  <dt className="text-xs text-muted">
                    Setoran Harga Dasar ke Cimoring
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-forest tabular-nums">
                    {formatRupiah(summary.totalBaseDueToCimoring)}
                  </dd>
                </div>
                <div className="rounded-xl border border-subtle bg-canvas p-4">
                  <dt className="text-xs text-muted">
                    Total Ujrah Kotor Kelompok
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-chili-hover tabular-nums">
                    {formatRupiah(summary.totalUjrahGross)}
                  </dd>
                </div>
                <div className="rounded-xl border border-subtle bg-canvas p-4">
                  <dt className="text-xs text-muted">
                    Dana Packing Aman Terkumpul
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-ink tabular-nums">
                    {formatRupiah(summary.totalPackingCollected)}
                  </dd>
                </div>
                <div className="rounded-xl border border-subtle bg-canvas p-4">
                  <dt className="text-xs text-muted">
                    Estimasi Sisihan Infak 2,5% Ujrah
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-ink tabular-nums">
                    {formatRupiah(Math.round(summary.totalUjrahGross * 0.025))}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
                <p className="text-xs text-muted">
                  Unduh CSV untuk cadangan laporan bulanan di Excel dan Google
                  Drive Cimoring.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="min-h-11 rounded-full bg-forest px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Export Laporan CSV
                </button>
              </div>
            </section>

            <section className="lg:col-span-5 rounded-2xl border border-subtle bg-surface p-6">
              <h2 className="font-display text-xl font-bold text-ink">
                Pengaturan Data Mitra &amp; Toko
              </h2>
              <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="set-wa"
                    className="block text-sm font-semibold text-ink"
                  >
                    Nomor WhatsApp Admin
                  </label>
                  <input
                    id="set-wa"
                    type="tel"
                    value={settings?.admin_whatsapp || ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        admin_whatsapp: e.target.value,
                      }))
                    }
                    placeholder="0812xxxxxxxx"
                    className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="set-bank"
                    className="block text-sm font-semibold text-ink"
                  >
                    Info Rekening Bank / QRIS
                  </label>
                  <textarea
                    id="set-bank"
                    rows={3}
                    value={settings?.bank_info || ""}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, bank_info: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-control bg-canvas p-3 text-sm"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="set-pirt"
                      className="block text-sm font-semibold text-ink"
                    >
                      Nomor PIRT
                    </label>
                    <input
                      id="set-pirt"
                      type="text"
                      value={settings?.pirt_number || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          pirt_number: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="set-halal"
                      className="block text-sm font-semibold text-ink"
                    >
                      Nomor Sertifikat Halal
                    </label>
                    <input
                      id="set-halal"
                      type="text"
                      value={settings?.halal_number || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          halal_number: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="set-packing"
                    className="block text-sm font-semibold text-ink"
                  >
                    Biaya Packing Aman (Rp)
                  </label>
                  <input
                    id="set-packing"
                    type="number"
                    min="0"
                    value={settings?.packing_fee ?? 2000}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        packing_fee: Number(e.target.value),
                      }))
                    }
                    className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm tabular-nums"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="min-h-11 w-full rounded-full bg-chili px-5 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
                >
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan Toko"}
                </button>
              </form>

              <div className="mt-6 border-t border-subtle pt-5 space-y-3">
                <h3 className="text-sm font-semibold text-ink">
                  Gambar QRIS Resmi CimoFood
                </h3>
                {settings?.qris_image_url ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-subtle bg-canvas p-3">
                    <div className="rounded-lg bg-white p-1.5 border border-subtle">
                      <img
                        src={settings.qris_image_url}
                        alt="QRIS Resmi CimoFood"
                        className="h-24 w-24 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-40 space-y-1.5">
                      <p className="text-xs font-medium text-ink">
                        QRIS aktif &amp; tampil di halaman Cek Pesanan pembeli.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={settings.qris_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-forest underline-offset-2 hover:underline"
                        >
                          Lihat Penuh
                        </a>
                        <button
                          type="button"
                          onClick={handleRemoveQris}
                          disabled={uploadingQris}
                          className="text-xs font-semibold text-chili-hover underline-offset-2 hover:underline disabled:opacity-60"
                        >
                          Hapus QRIS
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Belum ada gambar QRIS. Upload gambar QRIS (JPG, PNG, WebP,
                    maks. 2 MB) agar tampil saat pembeli membuka halaman Cek
                    Pesanan.
                  </p>
                )}

                <div className="space-y-2">
                  <label htmlFor="upload-qris-input" className="sr-only">
                    Upload file gambar QRIS toko
                  </label>
                  <input
                    ref={qrisInputRef}
                    id="upload-qris-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setQrisFile(e.target.files?.[0] || null)}
                    className="block w-full rounded-md border border-control bg-canvas p-2 text-xs text-ink"
                  />
                  <button
                    type="button"
                    onClick={handleUploadQris}
                    disabled={uploadingQris || !qrisFile}
                    className="min-h-10 w-full rounded-full border border-control bg-sand px-4 text-xs font-semibold text-ink hover:border-ink disabled:opacity-60"
                  >
                    {uploadingQris
                      ? "Mengunggah QRIS..."
                      : settings?.qris_image_url
                      ? "Ganti Gambar QRIS Toko"
                      : "Upload Gambar QRIS Toko"}
                  </button>
                </div>
              </div>

              {backendStatus && (
                <div className="mt-6 border-t border-subtle pt-5 space-y-2.5">
                  <h3 className="text-sm font-semibold text-ink">
                    Status Integrasi Backend
                  </h3>
                  <dl className="space-y-2 rounded-xl border border-subtle bg-canvas p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted">Koneksi Supabase Env</dt>
                      <dd
                        className={`font-semibold ${
                          backendStatus.supabaseConfigured
                            ? "text-forest"
                            : "text-amber-ink"
                        }`}
                      >
                        {backendStatus.supabaseConfigured
                          ? "Tersambung"
                          : "Mode Preview Lokal"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted">Tabel DB &amp; payment_events</dt>
                      <dd
                        className={`font-semibold ${
                          backendStatus.tablesReady &&
                          backendStatus.paymentEventsReady
                            ? "text-forest"
                            : "text-muted"
                        }`}
                      >
                        {backendStatus.tablesReady &&
                        backendStatus.paymentEventsReady
                          ? "Siap"
                          : "Menunggu SQL Run"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted">Storage Buckets</dt>
                      <dd
                        className={`font-semibold ${
                          backendStatus.bucketsReady
                            ? "text-forest"
                            : "text-muted"
                        }`}
                      >
                        {backendStatus.bucketsReady
                          ? "Aktif (2 Bucket)"
                          : `Belum (${backendStatus.missingBuckets.join(", ")})`}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted">Whitelist ADMIN_EMAILS</dt>
                      <dd
                        className={`font-semibold ${
                          backendStatus.adminWhitelistConfigured
                            ? "text-forest"
                            : "text-amber-ink"
                        }`}
                      >
                        {backendStatus.adminWhitelistConfigured
                          ? `Aktif (${backendStatus.adminEmailCount} email)`
                          : "Belum diisi"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted">Midtrans Snap Env</dt>
                      <dd
                        className={`font-semibold ${
                          backendStatus.midtransConfigured
                            ? "text-forest"
                            : "text-muted"
                        }`}
                      >
                        {backendStatus.midtransConfigured
                          ? backendStatus.midtransProduction
                            ? "Live"
                            : "Sandbox Siap"
                          : "Belum dikonfigurasi"}
                      </dd>
                    </div>
                  </dl>
                  {backendStatus.error && (
                    <p className="text-xs text-chili-hover">
                      Info DB: {backendStatus.error}
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-[#121110]/60 backdrop-blur-[1px]"
            onClick={() => setSelectedOrder(null)}
            aria-hidden="true"
          />
          <aside
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Detail pesanan ${selectedOrder.order_code}`}
            className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-control bg-surface p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-3 border-b border-subtle pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink tabular-nums">
                  {selectedOrder.order_code}
                </h2>
                <p className="text-sm text-muted">
                  {selectedOrder.customer_name} ({selectedOrder.customer_whatsapp})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="min-h-11 rounded-md border border-control px-3.5 text-sm font-semibold text-ink hover:bg-sand"
              >
                Tutup
              </button>
            </div>

            {drawerFeedback && (
              <div
                role="status"
                className="rounded-lg border border-forest bg-sand p-3 text-xs font-medium text-forest"
              >
                {drawerFeedback}
              </div>
            )}
            {drawerError && (
              <div
                role="alert"
                className="rounded-lg border border-chili bg-canvas p-3 text-xs font-medium text-chili-hover"
              >
                {drawerError}
              </div>
            )}

            <div className="rounded-xl border border-subtle bg-canvas p-4 text-sm space-y-1.5">
              <p>
                <strong>Alamat:</strong> {selectedOrder.shipping_address}
              </p>
              <p>
                <strong>Kurir:</strong> {selectedOrder.courier}
              </p>
              {selectedOrder.notes && (
                <p>
                  <strong>Catatan:</strong> {selectedOrder.notes}
                </p>
              )}
              {selectedOrder.referral_code && (
                <p>
                  <strong>Kode Reseller:</strong> {selectedOrder.referral_code}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">
                Status &amp; Bukti Pembayaran Pembeli
              </h3>
              {(selectedOrder.payment_provider === "midtrans" ||
                selectedOrder.paid_at) && (
                <div className="mt-2 rounded-xl border border-forest bg-sand p-3 text-xs space-y-1">
                  <p className="font-semibold text-forest">
                    Gateway: {selectedOrder.payment_provider || "Midtrans"}
                    {selectedOrder.paid_at ? " (Terverifikasi Lunas)" : ""}
                  </p>
                  {selectedOrder.payment_method && (
                    <p className="text-ink">
                      Metode: {selectedOrder.payment_method}
                    </p>
                  )}
                  {selectedOrder.payment_reference && (
                    <p className="text-muted tabular-nums">
                      Referensi: {selectedOrder.payment_reference}
                    </p>
                  )}
                  {selectedOrder.paid_at && (
                    <p className="text-muted tabular-nums">
                      Waktu Lunas:{" "}
                      {new Date(selectedOrder.paid_at).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              )}
              {selectedOrder.payment_proof_signed_url ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-subtle bg-canvas p-2">
                  <img
                    src={selectedOrder.payment_proof_signed_url}
                    alt={`Bukti pembayaran ${selectedOrder.order_code}`}
                    className="max-h-64 w-full rounded-lg object-contain"
                  />
                </div>
              ) : !selectedOrder.paid_at ? (
                <p className="mt-1 text-sm text-muted">
                  Pembeli belum melunasi atau mengunggah bukti transfer/QRIS.
                </p>
              ) : null}
            </div>

            <div className="space-y-2.5 border-t border-subtle pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  Foto Bukti Packing Aman 4 Lapis
                </h3>
                {selectedOrder.packing_proof_signed_url && (
                  <button
                    type="button"
                    onClick={handleRemovePackingProof}
                    disabled={uploadingPacking}
                    className="text-xs font-semibold text-chili-hover underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>

              {selectedOrder.packing_proof_signed_url ? (
                <div className="overflow-hidden rounded-xl border border-subtle bg-canvas p-2">
                  <img
                    src={selectedOrder.packing_proof_signed_url}
                    alt={`Foto packing ${selectedOrder.order_code}`}
                    className="max-h-56 w-full rounded-lg object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Unggah foto paket sebelum dikirim (JPG, PNG, WebP, maks. 2 MB)
                  agar pembeli dapat memantau keamanan packing di Cek Pesanan.
                </p>
              )}

              <div className="space-y-2">
                <label htmlFor="upload-packing-input" className="sr-only">
                  Upload foto bukti packing pesanan
                </label>
                <input
                  ref={packingInputRef}
                  id="upload-packing-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPackingFile(e.target.files?.[0] || null)}
                  className="block w-full rounded-md border border-control bg-canvas p-2 text-xs text-ink"
                />
                <button
                  type="button"
                  onClick={handleUploadPackingProof}
                  disabled={uploadingPacking || !packingFile}
                  className="min-h-10 w-full rounded-full border border-control bg-sand px-4 text-xs font-semibold text-ink hover:border-ink disabled:opacity-60"
                >
                  {uploadingPacking
                    ? "Mengunggah Foto Packing..."
                    : selectedOrder.packing_proof_signed_url
                    ? "Ganti Foto Bukti Packing"
                    : "Unggah Foto Bukti Packing"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4 border-t border-subtle pt-4">
              {selectedOrder.status === "menunggu_konfirmasi" && (
                <div className="rounded-xl border border-amber-bg bg-sand p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-ink">
                    Langkah Berikutnya: Konfirmasi Stok &amp; Ongkir
                  </p>
                  <button
                    type="button"
                    disabled={savingOrder}
                    onClick={() => persistOrderUpdate("menunggu_pembayaran")}
                    className="min-h-10 w-full rounded-full bg-forest px-4 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                  >
                    {savingOrder
                      ? "Menyimpan..."
                      : "Simpan Ongkir & Aktifkan Tagihan Pembeli"}
                  </button>
                </div>
              )}

              {["menunggu_pembayaran", "verifikasi_bayar"].includes(
                selectedOrder.status
              ) && (
                <div className="rounded-xl border border-forest bg-sand p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-ink">
                    {selectedOrder.status === "verifikasi_bayar"
                      ? "Bukti bayar sudah masuk. Konfirmasi agar langsung dikemas:"
                      : "Sudah terima pelunasan dari pembeli?"}
                  </p>
                  <button
                    type="button"
                    disabled={savingOrder}
                    onClick={() => persistOrderUpdate("dikemas")}
                    className="min-h-10 w-full rounded-full bg-forest px-4 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                  >
                    {savingOrder
                      ? "Memproses..."
                      : "Tandai Lunas -> Sedang Dikemas"}
                  </button>
                </div>
              )}

              {["dikemas", "dibayar"].includes(selectedOrder.status) && (
                <div className="rounded-xl border border-forest bg-sand p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-ink">
                    Paket 4 lapis siap diserahkan ke {selectedOrder.courier}?
                  </p>
                  <button
                    type="button"
                    disabled={savingOrder}
                    onClick={() => persistOrderUpdate("dikirim")}
                    className="min-h-10 w-full rounded-full bg-forest px-4 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                  >
                    {savingOrder
                      ? "Memproses..."
                      : "Serahkan ke Kurir & Tandai Dalam Perjalanan"}
                  </button>
                </div>
              )}

              {selectedOrder.status === "dikirim" && (
                <div className="rounded-xl border border-subtle bg-canvas p-3.5 text-xs text-muted">
                  Status saat ini <strong>Diserahkan ke Kurir &amp; Dalam Perjalanan</strong>.
                  Pesanan akan otomatis menjadi <strong>Selesai</strong> setelah
                  pembeli menekan tombol <em>Pesanan Sudah Diterima</em> di
                  halaman Cek Pesanan.
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-shipping"
                  className="block text-sm font-semibold text-ink"
                >
                  Ongkos Kirim Dikonfirmasi (Rp)
                </label>
                <input
                  id="edit-shipping"
                  type="number"
                  min="0"
                  value={editShipping}
                  onChange={(e) => setEditShipping(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-status"
                  className="block text-sm font-semibold text-ink"
                >
                  Status Pesanan (Ringkas)
                </label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm"
                >
                  {!ADMIN_ORDER_STATUS_OPTIONS.includes(editStatus) &&
                    ORDER_STATUS_META[editStatus] && (
                      <option value={editStatus}>
                        {ORDER_STATUS_META[editStatus].label}
                      </option>
                    )}
                  {ADMIN_ORDER_STATUS_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {ORDER_STATUS_META[key]?.label || key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-tracking"
                  className="block text-sm font-semibold text-ink"
                >
                  Nomor Resi Pengiriman
                </label>
                <input
                  id="edit-tracking"
                  type="text"
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="Isi setelah paket dikirim ekspedisi"
                  className="mt-1 min-h-11 w-full rounded-md border border-control bg-canvas px-3 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingOrder}
                  className="flex-1 min-h-11 rounded-full bg-chili px-5 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
                >
                  {savingOrder ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <a
                  href={`https://wa.me/${normalizeWhatsapp(
                    selectedOrder.customer_whatsapp
                  )}?text=${encodeURIComponent(
                    `Halo ${selectedOrder.customer_name}, update pesanan CimoFood ${selectedOrder.order_code}: total tagihan termasuk ongkir (${selectedOrder.courier}) sebesar ${formatRupiah(
                      Number(selectedOrder.subtotal_sell) +
                        Number(selectedOrder.packing_fee) +
                        Number(editShipping || 0)
                    )}.${
                      editTracking ? ` Nomor resi: ${editTracking}.` : ""
                    }`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11 inline-flex items-center rounded-full bg-forest px-4 text-sm font-semibold text-white hover:opacity-95"
                >
                  Kabari Pembeli via WA
                </a>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
