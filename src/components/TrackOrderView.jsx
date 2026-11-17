"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOrderFlowStepIndex,
  ORDER_FLOW_STEPS,
  ORDER_STATUS_META,
} from "@/lib/constants";
import { formatRupiah, normalizeWhatsapp } from "@/lib/pricing";
import {
  removeRecentOrder,
  syncRecentOrderStatuses,
  upsertRecentOrder,
  useRecentOrders,
} from "@/lib/recent-orders";

function ensureMidtransSnapScript(scriptUrl, clientKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser tidak tersedia."));
  }
  if (window.snap?.pay) {
    return Promise.resolve(window.snap);
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("midtrans-snap-script");
    if (existing) {
      if (existing.getAttribute("data-loaded") === "1" && window.snap?.pay) {
        resolve(window.snap);
        return;
      }
      existing.addEventListener("load", () =>
        window.snap?.pay
          ? resolve(window.snap)
          : reject(new Error("Midtrans Snap gagal dimuat."))
      );
      existing.addEventListener("error", () =>
        reject(new Error("Gagal memuat skrip Midtrans Snap."))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = scriptUrl;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    script.onload = () => {
      script.setAttribute("data-loaded", "1");
      if (window.snap?.pay) {
        resolve(window.snap);
      } else {
        reject(new Error("Midtrans Snap tidak siap setelah skrip dimuat."));
      }
    };
    script.onerror = () =>
      reject(new Error("Gagal mengunduh skrip pembayaran Midtrans."));
    document.body.appendChild(script);
  });
}

export function TrackOrderView({
  initialCode = "",
  initialWa = "",
  initialMethod = "midtrans_auto",
  initialPaymentReturn = "",
  midtransConfig = { enabled: false, clientKey: "", snapScriptUrl: "" },
  initialResult = null,
  initialError = "",
}) {
  const recentOrders = useRecentOrders();
  const [code, setCode] = useState(initialCode);
  const [wa, setWa] = useState(initialWa);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [result, setResult] = useState(initialResult);

  const [paymentTab, setPaymentTab] = useState(
    initialResult?.order?.payment_proof_url
      ? "manual_transfer"
      : initialMethod === "manual_transfer"
      ? "manual_transfer"
      : "midtrans_auto"
  );

  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");

  const [snapLoading, setSnapLoading] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(false);
  const [snapMsg, setSnapMsg] = useState("");
  const [snapErr, setSnapErr] = useState("");

  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [receiptErr, setReceiptErr] = useState("");

  const proofInputRef = useRef(null);
  const syncedListRef = useRef(false);
  const returnSyncedRef = useRef(false);

  useEffect(() => {
    if (initialResult?.order) {
      upsertRecentOrder(initialResult.order, initialMethod);
    }
  }, [initialResult, initialMethod]);

  useEffect(() => {
    if (syncedListRef.current || recentOrders.length === 0) return;
    syncedListRef.current = true;
    syncRecentOrderStatuses(recentOrders);
  }, [recentOrders]);

  const syncPaymentStatus = useCallback(async (targetOrder) => {
    if (!targetOrder?.order_code || !targetOrder?.customer_whatsapp) return;
    setSyncingPayment(true);
    setSnapErr("");
    try {
      const res = await fetch("/api/payments/midtrans/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: targetOrder.order_code,
          whatsapp: targetOrder.customer_whatsapp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memeriksa status Midtrans.");
      }
      if (data.order) {
        setResult((prev) => ({ ...prev, order: data.order }));
        upsertRecentOrder(data.order, "midtrans_auto");
      }
      if (data.paid) {
        setSnapMsg(
          "Pembayaran via Midtrans berhasil dikonfirmasi! Pesanan Anda kini berstatus Sedang Dikemas."
        );
      } else if (data.transactionStatus === "pending") {
        setSnapMsg(
          "Pembayaran tercatat menunggu pelunasan (QRIS/VA Midtrans). Setelah Anda membayar, klik Cek Status Pembayaran."
        );
      } else if (
        ["expire", "cancel", "deny"].includes(data.transactionStatus)
      ) {
        setSnapErr(
          `Sesi pembayaran Midtrans sebelumnya (${data.transactionStatus}). Klik Bayar Sekarang via Midtrans untuk mencoba lagi.`
        );
      }
    } catch (err) {
      setSnapErr(err.message);
    } finally {
      setSyncingPayment(false);
    }
  }, []);

  useEffect(() => {
    if (
      returnSyncedRef.current ||
      initialPaymentReturn !== "finish" ||
      !initialResult?.order?.payment_order_id ||
      ["dikemas", "dikirim", "selesai", "dibatalkan"].includes(
        initialResult.order.status
      )
    ) {
      return;
    }
    returnSyncedRef.current = true;
    syncPaymentStatus(initialResult.order);
  }, [initialPaymentReturn, initialResult, syncPaymentStatus]);

  async function handlePayWithMidtrans(forceNew = false) {
    if (!order || snapLoading) return;
    setSnapErr("");
    setSnapMsg("");
    setSnapLoading(true);
    try {
      const res = await fetch("/api/payments/midtrans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: order.order_code,
          whatsapp: order.customer_whatsapp,
          forceNew,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memulai pembayaran Midtrans.");
      }

      if (data.order) {
        setResult((prev) => ({ ...prev, order: data.order }));
        upsertRecentOrder(data.order, "midtrans_auto");
      }

      if (data.alreadyPaid) {
        setSnapMsg(
          "Pembayaran Anda sudah terkonfirmasi lunas dan masuk tahap Sedang Dikemas."
        );
        return;
      }

      const scriptUrl = data.snapScriptUrl || activeMidtrans?.snapScriptUrl;
      const clientKey = data.clientKey || activeMidtrans?.clientKey;
      const snap = await ensureMidtransSnapScript(scriptUrl, clientKey);

      snap.pay(data.token, {
        language: "id",
        onSuccess: () => {
          syncPaymentStatus(data.order || order);
        },
        onPending: () => {
          syncPaymentStatus(data.order || order);
        },
        onError: () => {
          setSnapErr(
            "Pembayaran tidak berhasil atau dibatalkan di Midtrans. Anda dapat mencoba ulang atau memakai metode lain."
          );
        },
        onClose: () => {
          syncPaymentStatus(data.order || order);
        },
      });
    } catch (err) {
      setSnapErr(err.message);
    } finally {
      setSnapLoading(false);
    }
  }

  async function fetchAndSelectOrder(orderCode, orderWa) {
    setError("");
    setUploadMsg("");
    setUploadErr("");
    setSnapMsg("");
    setSnapErr("");
    setReceiptMsg("");
    setReceiptErr("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/track?code=${encodeURIComponent(
          orderCode
        )}&wa=${encodeURIComponent(orderWa)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Pesanan tidak ditemukan.");
      }
      setCode(orderCode);
      setWa(orderWa);
      setResult(data);
      upsertRecentOrder(data.order);
      if (data.order?.payment_proof_url) {
        setPaymentTab("manual_transfer");
      }
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    await fetchAndSelectOrder(code, wa);
  }

  async function handleUploadProof(e) {
    e.preventDefault();
    if (!proofFile || !result?.order) return;
    setUploadErr("");
    setUploadMsg("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("orderCode", result.order.order_code);
      formData.append("whatsapp", result.order.customer_whatsapp);
      formData.append("proof", proofFile);

      const res = await fetch("/api/orders/proof", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah bukti pembayaran.");
      }
      setResult((prev) => ({ ...prev, order: data.order }));
      upsertRecentOrder(data.order, "manual_transfer");
      setProofFile(null);
      if (proofInputRef.current) proofInputRef.current.value = "";
      setUploadMsg(
        "Bukti pembayaran berhasil diunggah. Admin akan segera memverifikasi."
      );
    } catch (err) {
      setUploadErr(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmReceipt() {
    if (!result?.order || confirmingReceipt) return;
    setReceiptErr("");
    setReceiptMsg("");
    setConfirmingReceipt(true);
    try {
      const res = await fetch("/api/orders/confirm-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: result.order.order_code,
          whatsapp: result.order.customer_whatsapp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Gagal mengonfirmasi penerimaan pesanan."
        );
      }
      setResult((prev) => ({ ...prev, order: data.order }));
      upsertRecentOrder(data.order);
      setReceiptMsg(
        "Terima kasih! Pesanan resmi ditandai Selesai diterima dengan baik."
      );
    } catch (err) {
      setReceiptErr(err.message);
    } finally {
      setConfirmingReceipt(false);
    }
  }

  const order = result?.order;
  const paymentInfo = result?.paymentInfo;
  const activeMidtrans = result?.midtransConfig || midtransConfig;
  const statusMeta = order
    ? ORDER_STATUS_META[order.status] || {
        label: order.status,
        shortLabel: order.status,
        tone: "amber",
      }
    : null;

  const currentStepIdx = order ? getOrderFlowStepIndex(order.status) : -1;
  const isPayableStage =
    order && ["menunggu_pembayaran", "verifikasi_bayar"].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Pesanan Saya &amp; Pembayaran
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Pantau progres pesanan CimoFood secara langsung, selesaikan
          pembayaran setelah ongkir dikonfirmasi, atau konfirmasi penerimaan
          paket di halaman ini.
        </p>
      </div>

      {recentOrders.length > 0 && (
        <section className="rounded-2xl border border-subtle bg-surface p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-ink">
                Pesanan Anda di Perangkat Ini ({recentOrders.length})
              </h2>
              <p className="text-xs text-muted">
                Klik kode pesanan untuk langsung membuka rincian &amp; tombol
                pembayarannya.
              </p>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {recentOrders.map((item) => {
              const meta = ORDER_STATUS_META[item.status] || {
                shortLabel: item.status,
                tone: "amber",
              };
              const isSelected =
                order &&
                order.order_code.toUpperCase() === item.orderCode.toUpperCase();
              return (
                <div
                  key={item.orderCode}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                    isSelected
                      ? "border-forest bg-sand ring-1 ring-forest"
                      : "border-subtle bg-canvas"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      fetchAndSelectOrder(item.orderCode, item.customerWhatsapp)
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {item.orderCode}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          meta.tone === "green"
                            ? "bg-forest text-white"
                            : meta.tone === "red"
                            ? "bg-chili text-white"
                            : "bg-amber-bg text-white"
                        }`}
                      >
                        {meta.shortLabel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted tabular-nums">
                      {item.courier || "Kurir dipilih"} |{" "}
                      {formatRupiah(item.totalAmount)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRecentOrder(item.orderCode)}
                    aria-label={`Hapus ${item.orderCode} dari daftar`}
                    className="min-h-9 shrink-0 rounded-md px-2 text-xs font-medium text-muted hover:text-chili-hover"
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <form
        onSubmit={handleSearch}
        className="grid gap-4 rounded-2xl border border-subtle bg-surface p-6 sm:grid-cols-12 sm:items-end"
      >
        <div className="sm:col-span-5">
          <label
            htmlFor="track-code"
            className="block text-sm font-semibold text-ink"
          >
            Kode Pesanan
          </label>
          <input
            id="track-code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Contoh: CF-261116-A1B2"
            className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm uppercase text-ink placeholder:text-muted"
          />
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor="track-wa"
            className="block text-sm font-semibold text-ink"
          >
            Nomor WhatsApp
          </label>
          <input
            id="track-wa"
            type="tel"
            required
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="0812xxxxxxxx"
            className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
          />
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-full bg-chili px-5 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
          >
            {loading ? "Mencari..." : "Cek Pesanan"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-chili bg-surface p-4 text-sm font-medium text-chili-hover"
        >
          {error}
        </div>
      )}

      {!order && !loading && !error && (
        <div className="rounded-2xl border border-subtle bg-sand p-6 text-sm text-muted">
          Belum ada pesanan yang ditampilkan. Pilih salah satu pesanan Anda di
          atas atau isi kode pesanan dan nomor WhatsApp pada formulir pencarian.
        </div>
      )}

      {order && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-subtle bg-surface p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-subtle pb-4">
              <div>
                <p className="text-xs font-semibold text-muted">Kode Pesanan</p>
                <h2 className="font-display text-2xl font-bold text-ink tabular-nums">
                  {order.order_code}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Penerima: {order.customer_name} | Kurir: {order.courier}
                </p>
              </div>
              <span
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  statusMeta.tone === "green"
                    ? "bg-forest text-white"
                    : statusMeta.tone === "red"
                    ? "bg-chili text-white"
                    : "bg-amber-bg text-white"
                }`}
              >
                {statusMeta.label}
              </span>
            </div>

            {order.status !== "dibatalkan" && (
              <div>
                <p className="mb-3 text-xs font-semibold text-ink">
                  Progres Pesanan (5 Tahap)
                </p>
                <ol className="grid gap-2 sm:grid-cols-5">
                  {ORDER_FLOW_STEPS.map((stepKey, idx) => {
                    const reached = idx <= currentStepIdx;
                    return (
                      <li
                        key={stepKey}
                        className={`rounded-lg border px-2.5 py-2 text-xs ${
                          reached
                            ? "border-forest bg-sand font-semibold text-ink"
                            : "border-subtle bg-canvas text-muted"
                        }`}
                      >
                        <span className="mr-1 tabular-nums">{idx + 1}.</span>
                        {ORDER_STATUS_META[stepKey].shortLabel}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {order.status === "dikirim" && (
              <div className="rounded-2xl border border-forest bg-sand p-5 space-y-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    Paket Sudah Sampai di Tangan Anda?
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Setelah mengecek kemasan dan isi pesanan dalam kondisi baik,
                    klik tombol di bawah untuk menandai pesanan selesai
                    diterima.
                  </p>
                </div>

                {receiptErr && (
                  <p role="alert" className="text-xs font-semibold text-chili-hover">
                    {receiptErr}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  disabled={confirmingReceipt}
                  className="min-h-11 rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                >
                  {confirmingReceipt
                    ? "Menyimpan Konfirmasi..."
                    : "Pesanan Sudah Diterima (Selesaikan)"}
                </button>
              </div>
            )}

            {receiptMsg && (
              <div
                role="status"
                className="rounded-xl border border-forest bg-sand p-4 text-sm font-semibold text-forest"
              >
                {receiptMsg}
              </div>
            )}

            {order.paid_at && (
              <div className="rounded-xl border border-forest bg-sand p-4 text-sm space-y-1">
                <p className="text-xs font-semibold text-forest">
                  Pembayaran Terkonfirmasi Lunas
                </p>
                <p className="font-semibold text-ink">
                  Metode: {order.payment_method || "Midtrans"}
                  {order.payment_reference ? ` (${order.payment_reference})` : ""}
                </p>
                <p className="text-xs text-muted tabular-nums">
                  Lunas pada:{" "}
                  {new Date(order.paid_at).toLocaleString("id-ID")}
                </p>
              </div>
            )}

            {order.tracking_number && (
              <div className="rounded-xl border border-forest bg-sand p-4">
                <p className="text-xs font-semibold text-forest">
                  Nomor Resi Pengiriman ({order.courier})
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
                  {order.tracking_number}
                </p>
              </div>
            )}

            {order.packing_proof_signed_url && (
              <div className="rounded-xl border border-subtle bg-canvas p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Foto Bukti Packing Aman 4 Lapis
                    </p>
                    <p className="text-xs text-muted">
                      Dokumentasi kemasan bubble wrap berlapis dan penyangga
                      kardus sebelum pengiriman.
                    </p>
                  </div>
                  <a
                    href={order.packing_proof_signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-forest underline-offset-2 hover:underline"
                  >
                    Buka Foto Penuh
                  </a>
                </div>
                <img
                  src={order.packing_proof_signed_url}
                  alt={`Foto bukti packing pesanan ${order.order_code}`}
                  className="max-h-72 w-full rounded-lg bg-surface object-contain"
                />
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Daftar Produk
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {(order.items || []).map((it, idx) => (
                    <li
                      key={it.id || idx}
                      className="flex justify-between border-b border-subtle pb-1.5"
                    >
                      <span className="text-ink">
                        {it.product_name} ({it.size_label}) x{it.quantity}
                      </span>
                      <span className="font-medium text-ink tabular-nums">
                        {formatRupiah(it.unit_sell_price * it.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="space-y-2 rounded-xl border border-subtle bg-canvas p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal Produk</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {formatRupiah(order.subtotal_sell)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Biaya Packing 4 Lapis</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {formatRupiah(order.packing_fee)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Ongkos Kirim</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {order.shipping_cost > 0
                      ? formatRupiah(order.shipping_cost)
                      : order.status === "menunggu_konfirmasi"
                      ? "Menunggu input admin"
                      : formatRupiah(0)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-subtle pt-2.5 text-base">
                  <dt className="font-bold text-ink">Total Pembayaran</dt>
                  <dd className="font-bold text-ink tabular-nums">
                    {formatRupiah(order.total_amount)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {order.status === "menunggu_konfirmasi" && (
            <section className="rounded-2xl border border-amber-bg bg-surface p-6 space-y-3">
              <h3 className="font-display text-xl font-bold text-ink">
                Pembayaran Dibuka Setelah Admin Input Ongkir
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Saat ini admin sedang mengecek stok varian yang Anda pesan serta
                tarif riil {order.courier}. Setelah ongkos kirim masuk, menu{" "}
                <strong>Bayar Otomatis (Midtrans QRIS / VA / E-Wallet)</strong>{" "}
                dan <strong>QRIS / Transfer Bank</strong> akan terbuka otomatis
                di bagian ini.
              </p>
              {paymentInfo?.admin_whatsapp && (
                <a
                  href={`https://wa.me/${normalizeWhatsapp(
                    paymentInfo.admin_whatsapp
                  )}?text=${encodeURIComponent(
                    `Halo Admin CimoFood, mohon info stok dan ongkir untuk kode pesanan ${order.order_code}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Tanya Progres Ongkir via WhatsApp
                </a>
              )}
            </section>
          )}

          {isPayableStage && (
            <section className="rounded-2xl border border-subtle bg-surface p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-ink">
                  Pilih Cara Pembayaran ({formatRupiah(order.total_amount)})
                </h3>
                <p className="text-xs text-muted">
                  Ongkos kirim sudah dikonfirmasi. Selesaikan pembayaran sesuai
                  metode yang paling nyaman untuk Anda.
                </p>
              </div>

              {order.status === "verifikasi_bayar" && (
                <div
                  role="status"
                  className="rounded-xl border border-forest bg-sand p-3.5 text-sm font-medium text-forest"
                >
                  Bukti transfer/QRIS Anda sedang dicek oleh admin. Jika perlu
                  mengganti foto bukti, unggah kembali pada tab Manual.
                </div>
              )}

              <div
                role="tablist"
                aria-label="Metode pembayaran CimoFood"
                className="flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={paymentTab === "midtrans_auto"}
                  onClick={() => setPaymentTab("midtrans_auto")}
                  className={`min-h-11 rounded-full border px-4 text-xs font-semibold ${
                    paymentTab === "midtrans_auto"
                      ? "border-forest bg-forest text-white"
                      : "border-control bg-canvas text-ink hover:bg-sand"
                  }`}
                >
                  Bayar Otomatis (Midtrans QRIS / VA / E-Wallet)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={paymentTab === "manual_transfer"}
                  onClick={() => setPaymentTab("manual_transfer")}
                  className={`min-h-11 rounded-full border px-4 text-xs font-semibold ${
                    paymentTab === "manual_transfer"
                      ? "border-ink bg-sand text-ink"
                      : "border-control bg-canvas text-ink hover:bg-sand"
                  }`}
                >
                  Transfer Bank / QRIS Toko (Manual)
                </button>
              </div>

              {paymentTab === "midtrans_auto" ? (
                <div className="rounded-xl border border-subtle bg-sand p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        Total Tagihan Otomatis
                      </p>
                      <p className="text-xs text-muted">
                        Termasuk subtotal produk, packing 4 lapis, dan ongkos
                        kirim (tanpa biaya admin tambahan).
                      </p>
                    </div>
                    <span className="font-display text-2xl font-bold text-ink tabular-nums">
                      {formatRupiah(order.total_amount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md border border-subtle bg-surface px-2.5 py-1 font-medium text-ink">
                      QRIS Instan
                    </span>
                    <span className="rounded-md border border-subtle bg-surface px-2.5 py-1 font-medium text-ink">
                      VA BCA / BNI / BRI / Mandiri
                    </span>
                    <span className="rounded-md border border-subtle bg-surface px-2.5 py-1 font-medium text-ink">
                      GoPay / OVO / Dana / ShopeePay
                    </span>
                  </div>

                  {snapMsg && (
                    <div
                      role="status"
                      className="rounded-lg border border-forest bg-surface p-3.5 text-xs font-medium text-forest"
                    >
                      {snapMsg}
                    </div>
                  )}
                  {snapErr && (
                    <div
                      role="alert"
                      className="rounded-lg border border-chili bg-surface p-3.5 text-xs font-medium text-chili-hover"
                    >
                      {snapErr}
                    </div>
                  )}

                  {activeMidtrans?.enabled ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => handlePayWithMidtrans(false)}
                          disabled={snapLoading}
                          className="min-h-11 rounded-full bg-chili px-6 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
                        >
                          {snapLoading
                            ? "Membuka Midtrans..."
                            : "Bayar Sekarang via Midtrans"}
                        </button>

                        {order.payment_order_id && (
                          <button
                            type="button"
                            onClick={() => syncPaymentStatus(order)}
                            disabled={syncingPayment}
                            className="min-h-11 rounded-full border border-control bg-surface px-4 text-xs font-semibold text-ink hover:border-ink disabled:opacity-60"
                          >
                            {syncingPayment
                              ? "Mengecek Status..."
                              : "Cek Status Pembayaran"}
                          </button>
                        )}
                      </div>

                      {order.payment_redirect_url && (
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <a
                            href={order.payment_redirect_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-forest underline-offset-2 hover:underline"
                          >
                            Popup tidak muncul? Buka Halaman Bayar Midtrans
                          </a>
                          <button
                            type="button"
                            onClick={() => handlePayWithMidtrans(true)}
                            disabled={snapLoading}
                            className="font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
                          >
                            Ganti Metode / Buat Sesi Baru
                          </button>
                        </div>
                      )}

                      <p className="text-xs leading-relaxed text-muted">
                        Setelah menyelesaikan QRIS / Virtual Account di popup
                        Midtrans, status pesanan otomatis berpindah ke{" "}
                        <strong>Sedang Dikemas</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-subtle bg-surface p-3.5 text-xs leading-relaxed text-muted">
                        Pembayaran otomatis Midtrans belum diaktifkan di server.
                        Gunakan transfer bank / QRIS manual toko di sebelah.
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentTab("manual_transfer")}
                        className="min-h-11 rounded-full bg-chili px-6 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover"
                      >
                        Bayar via QRIS / Transfer Bank Sekarang
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-subtle bg-sand p-4 text-sm space-y-3">
                    <div>
                      <p className="font-semibold text-ink">
                        Tujuan Pembayaran Resmi CimoFood:
                      </p>
                      <p className="mt-1 whitespace-pre-line text-muted">
                        {paymentInfo?.bank_info ||
                          "Hubungi admin via WhatsApp untuk informasi rekening atau QRIS."}
                      </p>
                    </div>

                    {paymentInfo?.qris_image_url && (
                      <div className="border-t border-subtle pt-3 space-y-2">
                        <p className="text-xs font-semibold text-ink">
                          Scan QRIS Resmi CimoFood
                        </p>
                        <div className="inline-block rounded-xl border border-subtle bg-white p-3 shadow-sm">
                          <img
                            src={paymentInfo.qris_image_url}
                            alt="QRIS Resmi CimoFood"
                            className="h-52 w-52 object-contain"
                          />
                        </div>
                        <div>
                          <a
                            href={paymentInfo.qris_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-forest underline-offset-2 hover:underline"
                          >
                            Buka / Unduh Gambar QRIS
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {order.payment_proof_signed_url && (
                    <div className="rounded-xl border border-subtle bg-canvas p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-forest">
                          Bukti Pembayaran Terunggah
                        </p>
                        <a
                          href={order.payment_proof_signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-forest underline-offset-2 hover:underline"
                        >
                          Lihat Gambar
                        </a>
                      </div>
                      <img
                        src={order.payment_proof_signed_url}
                        alt={`Bukti pembayaran ${order.order_code}`}
                        className="max-h-52 w-full rounded-lg bg-surface object-contain"
                      />
                    </div>
                  )}

                  {uploadMsg && (
                    <div
                      role="status"
                      className="rounded-lg border border-forest bg-sand p-3.5 text-sm font-medium text-forest"
                    >
                      {uploadMsg}
                    </div>
                  )}
                  {uploadErr && (
                    <div
                      role="alert"
                      className="rounded-lg border border-chili bg-canvas p-3.5 text-sm font-medium text-chili-hover"
                    >
                      {uploadErr}
                    </div>
                  )}

                  <form onSubmit={handleUploadProof} className="space-y-3">
                    <div>
                      <label
                        htmlFor="payment-proof-input"
                        className="block text-sm font-semibold text-ink"
                      >
                        Foto / Screenshot Bukti Pembayaran (JPG, PNG, WebP,
                        maks. 2 MB)
                      </label>
                      <input
                        ref={proofInputRef}
                        id="payment-proof-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={(e) =>
                          setProofFile(e.target.files?.[0] || null)
                        }
                        className="mt-1.5 block w-full rounded-md border border-control bg-canvas p-2.5 text-sm text-ink"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || !proofFile}
                      className="min-h-11 rounded-full bg-chili px-6 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
                    >
                      {uploading
                        ? "Mengunggah Bukti..."
                        : order.payment_proof_url
                        ? "Ganti Bukti Pembayaran"
                        : "Kirim Bukti Pembayaran"}
                    </button>
                  </form>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
