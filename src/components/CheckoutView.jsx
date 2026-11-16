"use client";

import { useState } from "react";
import Link from "next/link";
import { COURIERS } from "@/lib/constants";
import { buildOrderConfirmationText, formatRupiah } from "@/lib/pricing";
import { useCart } from "./CartProvider";

export function CheckoutView({ packingFee }) {
  const { items, hydrated, subtotal, updateQuantity, clearCart } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [courier, setCourier] = useState(COURIERS[0].id);
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const totalWeightGrams = items.reduce(
    (sum, it) => sum + Number(it.weightGrams || 250) * it.quantity,
    0
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerWhatsapp,
          shippingAddress,
          courier,
          notes,
          referralCode,
          items: items.map((it) => ({
            variantId: it.variantId,
            quantity: it.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pesanan.");
      }

      setCreatedResult(data);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Abaikan jika browser memblokir clipboard
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-muted">
        Memuat keranjang belanja...
      </div>
    );
  }

  if (createdResult?.order) {
    const { order, whatsappUrl } = createdResult;
    const messageText = buildOrderConfirmationText(order);

    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-forest bg-surface p-6 sm:p-8 space-y-5">
          <div>
            <span className="inline-flex rounded-full bg-forest px-3 py-1 text-xs font-semibold text-white">
              Pesanan Berhasil Dicatat
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold text-ink">
              Kode Pesanan: <span className="tabular-nums">{order.order_code}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Simpan kode pesanan ini. Langkah selanjutnya: kirim rincian order ke
              WhatsApp admin agar admin mengecek stok produsen dan memberi total
              ongkos kirim maksimal 1 jam di jam layanan.
            </p>
          </div>

          <div className="rounded-xl border border-subtle bg-canvas p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Penerima</span>
              <span className="font-semibold text-ink">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Kurir Pilihan</span>
              <span className="font-semibold text-ink">{order.courier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Subtotal + Packing</span>
              <span className="font-bold text-ink tabular-nums">
                {formatRupiah(order.total_amount)} (belum termasuk ongkir)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-11 inline-flex items-center justify-center rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                Kirim Konfirmasi ke WhatsApp Admin
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleCopyText(messageText)}
                className="min-h-11 inline-flex items-center justify-center rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                {copied
                  ? "Format Pesanan Disalin"
                  : "Salin Format Pesanan (WA Admin Pending)"}
              </button>
            )}

            <Link
              href={`/cek-pesanan?code=${encodeURIComponent(
                order.order_code
              )}&wa=${encodeURIComponent(order.customer_whatsapp)}`}
              className="min-h-11 inline-flex items-center justify-center rounded-full bg-chili px-6 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover"
            >
              Pantau Status &amp; Upload Bukti Bayar
            </Link>
          </div>

          <div className="border-t border-subtle pt-4">
            <p className="text-xs font-semibold text-ink">
              Pratinjau Format Pesan WhatsApp:
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-subtle bg-canvas p-3 text-xs text-muted">
              {messageText}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-subtle bg-surface p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">
            Keranjang Belanja Kosong
          </h1>
          <p className="mt-2 text-sm text-muted">
            Pilih varian rasa dan ukuran Cimoring terlebih dahulu sebelum mengisi
            formulir pengiriman.
          </p>
          <Link
            href="/katalog"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-chili px-6 text-sm font-semibold text-white hover:bg-chili-hover"
          >
            Pilih Produk di Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Checkout Pesanan
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Pesanan dicatat ke sistem terlebih dahulu untuk dikonfirmasi stok dan
          ongkos kirimnya oleh admin sebelum kamu melakukan pembayaran.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 space-y-5 rounded-2xl border border-subtle bg-surface p-6"
        >
          <h2 className="font-display text-xl font-bold text-ink">
            Data Penerima &amp; Pengiriman
          </h2>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-chili bg-canvas p-3.5 text-sm font-medium text-chili-hover"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="customer-name"
              className="block text-sm font-semibold text-ink"
            >
              Nama Penerima
            </label>
            <input
              id="customer-name"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama lengkap penerima"
              className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
            />
          </div>

          <div>
            <label
              htmlFor="customer-wa"
              className="block text-sm font-semibold text-ink"
            >
              Nomor WhatsApp Aktif
            </label>
            <input
              id="customer-wa"
              type="tel"
              required
              value={customerWhatsapp}
              onChange={(e) => setCustomerWhatsapp(e.target.value)}
              placeholder="0812xxxxxxxx"
              className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
            />
            <p className="mt-1 text-xs text-muted">
              Dipakai admin untuk konfirmasi ongkir dan verifikasi saat cek
              pesanan.
            </p>
          </div>

          <div>
            <label
              htmlFor="shipping-address"
              className="block text-sm font-semibold text-ink"
            >
              Alamat Pengiriman Lengkap
            </label>
            <textarea
              id="shipping-address"
              rows={3}
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan, kota/kabupaten, kode pos"
              className="mt-1.5 w-full rounded-md border border-control bg-canvas p-3.5 text-sm text-ink placeholder:text-muted"
            />
          </div>

          <div>
            <label
              htmlFor="courier-select"
              className="block text-sm font-semibold text-ink"
            >
              Pilihan Pengiriman / Ekspedisi
            </label>
            <select
              id="courier-select"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink"
            >
              {COURIERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="order-notes"
                className="block text-sm font-semibold text-ink"
              >
                Catatan Pesanan (Opsional)
              </label>
              <input
                id="order-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: tambah kartu ucapan"
                className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
              />
            </div>

            <div>
              <label
                htmlFor="referral-code"
                className="block text-sm font-semibold text-ink"
              >
                Kode Reseller (Opsional)
              </label>
              <input
                id="referral-code"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Kosongkan jika beli langsung"
                className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-full bg-chili px-6 py-3 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
          >
            {submitting
              ? "Menyimpan Pesanan..."
              : "Buat Pesanan & Konfirmasi via WhatsApp"}
          </button>
        </form>

        <aside className="lg:col-span-5 rounded-2xl border border-subtle bg-sand p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">
            Ringkasan Keranjang
          </h2>

          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.variantId}
                className="flex items-center justify-between gap-3 rounded-xl border border-subtle bg-surface p-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted">
                    {item.sizeLabel} x {item.quantity} (
                    {formatRupiah(item.sellPrice * item.quantity)})
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity - 1)
                    }
                    aria-label={`Kurangi ${item.productName}`}
                    className="min-h-11 min-w-11 rounded-md border border-control bg-canvas text-sm font-semibold text-ink"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity + 1)
                    }
                    aria-label={`Tambah ${item.productName}`}
                    className="min-h-11 min-w-11 rounded-md border border-control bg-canvas text-sm font-semibold text-ink"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-subtle pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Perkiraan Berat Total</dt>
              <dd className="font-medium text-ink tabular-nums">
                {(totalWeightGrams / 1000).toFixed(2)} kg
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal Produk (termasuk ujrah)</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatRupiah(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Biaya Packing Aman 4 Lapis</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatRupiah(packingFee)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Ongkos Kirim ({courier})</dt>
              <dd className="font-medium text-amber-ink">
                Dikonfirmasi via WA
              </dd>
            </div>
            <div className="flex justify-between border-t border-subtle pt-3 text-base">
              <dt className="font-bold text-ink">Estimasi Awal (Non-Ongkir)</dt>
              <dd className="font-bold text-ink tabular-nums">
                {formatRupiah(subtotal + packingFee)}
              </dd>
            </div>
          </dl>

          <p className="text-xs leading-relaxed text-muted">
            Prinsip transaksi transparan (wakalah bil ujrah): harga sudah
            mencakup jasa layanan, tanpa biaya tersembunyi, dan dana dikembalikan
            penuh jika stok ternyata tidak tersedia.
          </p>
        </aside>
      </div>
    </div>
  );
}
