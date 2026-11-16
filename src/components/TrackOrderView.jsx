"use client";

import { useState } from "react";
import { ORDER_FLOW_STEPS, ORDER_STATUS_META } from "@/lib/constants";
import { formatRupiah } from "@/lib/pricing";

export function TrackOrderView({
  initialCode = "",
  initialWa = "",
  initialResult = null,
  initialError = "",
}) {
  const [code, setCode] = useState(initialCode);
  const [wa, setWa] = useState(initialWa);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [result, setResult] = useState(initialResult);

  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/track?code=${encodeURIComponent(
          code
        )}&wa=${encodeURIComponent(wa)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Pesanan tidak ditemukan.");
      }
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      setProofFile(null);
      setUploadMsg(
        "Bukti pembayaran berhasil diunggah. Admin akan segera memverifikasi."
      );
    } catch (err) {
      setUploadErr(err.message);
    } finally {
      setUploading(false);
    }
  }

  const order = result?.order;
  const paymentInfo = result?.paymentInfo;
  const statusMeta = order
    ? ORDER_STATUS_META[order.status] || {
        label: order.status,
        tone: "amber",
      }
    : null;

  const currentStepIdx = order ? ORDER_FLOW_STEPS.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Cek Status Pesanan &amp; Upload Bukti Bayar
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Masukkan kode pesanan dan nomor WhatsApp yang dipakai saat checkout
          untuk melihat ongkir, mengunggah bukti transfer/QRIS, atau mengecek
          nomor resi.
        </p>
      </div>

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
          Belum ada pesanan yang ditampilkan. Isi kode pesanan dan nomor WhatsApp
          di atas untuk melihat rincian terbaru.
        </div>
      )}

      {order && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-subtle bg-surface p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-subtle pb-4">
              <div>
                <p className="text-xs font-semibold text-muted">
                  Kode Pesanan
                </p>
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
                  Progres Pesanan
                </p>
                <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
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
                        {ORDER_STATUS_META[stepKey].shortLabel}
                      </li>
                    );
                  })}
                </ol>
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

          {!["dibayar", "dikemas", "dikirim", "selesai", "dibatalkan"].includes(
            order.status
          ) && (
            <section className="rounded-2xl border border-subtle bg-surface p-6 space-y-4">
              <h3 className="font-display text-xl font-bold text-ink">
                Pembayaran &amp; Upload Bukti Transfer / QRIS
              </h3>
              <div className="rounded-xl border border-subtle bg-sand p-4 text-sm">
                <p className="font-semibold text-ink">
                  Tujuan Pembayaran Resmi CimoFood:
                </p>
                <p className="mt-1 whitespace-pre-line text-muted">
                  {paymentInfo?.bank_info ||
                    "[DATA REKENING BANK & QRIS MITRA PENDING]"}
                </p>
              </div>

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
                    Foto / Screenshot Bukti Pembayaran (JPG, PNG, WebP, maks. 2 MB)
                  </label>
                  <input
                    id="payment-proof-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
