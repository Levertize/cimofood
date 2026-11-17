"use client";

import { useState } from "react";
import Link from "next/link";
import { COURIERS, PAYMENT_METHODS } from "@/lib/constants";
import { buildOrderConfirmationText, formatRupiah } from "@/lib/pricing";
import { upsertRecentOrder } from "@/lib/recent-orders";
import { useCart } from "./CartProvider";

export function CheckoutView({ packingFee }) {
  const { items, hydrated, subtotal, updateQuantity, clearCart } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");

  const [courier, setCourier] = useState(COURIERS[0].id);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalWeightGrams = items.reduce(
    (sum, it) => sum + Number(it.weightGrams || 250) * it.quantity,
    0
  );
  const selectedPaymentMeta =
    PAYMENT_METHODS.find((m) => m.id === paymentMethod) || PAYMENT_METHODS[0];
  const selectedCourierMeta =
    COURIERS.find((c) => c.id === courier) || COURIERS[0];

  function buildFullShippingAddress() {
    const parts = [
      streetAddress.trim(),
      district.trim() ? `Kec. ${district.trim()}` : "",
      city.trim(),
      postalCode.trim(),
    ].filter(Boolean);
    return parts.join(", ");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const shippingAddress = buildFullShippingAddress();
      const paymentLabel =
        paymentMethod === "midtrans_auto"
          ? "Preferensi: Bayar Otomatis (Midtrans)"
          : "Preferensi: Transfer Bank / QRIS Manual";
      const composedNotes = [paymentLabel, notes.trim()]
        .filter(Boolean)
        .join(" | ");

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerWhatsapp,
          shippingAddress,
          courier,
          notes: composedNotes,
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

      upsertRecentOrder(data.order, paymentMethod);
      setCreatedResult({ ...data, paymentMethod });
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
    const { order, whatsappUrl, paymentMethod: chosenMethod } = createdResult;
    const messageText = buildOrderConfirmationText(order);
    const trackUrl = `/cek-pesanan?code=${encodeURIComponent(
      order.order_code
    )}&wa=${encodeURIComponent(order.customer_whatsapp)}&method=${encodeURIComponent(
      chosenMethod || "midtrans_auto"
    )}`;

    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-forest bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <span className="inline-flex rounded-full bg-forest px-3 py-1 text-xs font-semibold text-white">
              Pesanan Berhasil Dicatat
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold text-ink">
              Kode Pesanan:{" "}
              <span className="tabular-nums">{order.order_code}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Pesanan Anda sudah tersimpan otomatis di daftar status perangkat
              ini dan siap dicek stok serta ongkos kirimnya oleh admin.
            </p>
          </div>

          <div className="rounded-xl border border-subtle bg-canvas p-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted">Penerima</span>
              <span className="font-semibold text-ink text-right">
                {order.customer_name}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">Alamat Tujuan</span>
              <span className="font-medium text-ink text-right max-w-xs">
                {order.shipping_address}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">Kurir Pilihan</span>
              <span className="font-semibold text-ink">{order.courier}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">Metode Pembayaran</span>
              <span className="font-semibold text-ink text-right">
                {chosenMethod === "midtrans_auto"
                  ? "Bayar Otomatis (Midtrans)"
                  : "Transfer / QRIS Manual"}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-t border-subtle pt-2.5">
              <span className="text-muted">Subtotal + Packing</span>
              <span className="font-bold text-ink tabular-nums">
                {formatRupiah(order.total_amount)} (non-ongkir)
              </span>
            </div>
          </div>

          <ol className="grid gap-2 sm:grid-cols-3 text-xs">
            <li className="rounded-xl border border-forest bg-sand p-3">
              <p className="font-bold text-forest">1. Tercatat di Sistem</p>
              <p className="mt-1 text-muted">
                Order masuk ke antrean admin &amp; terpantau di header browser
                Anda.
              </p>
            </li>
            <li className="rounded-xl border border-subtle bg-canvas p-3">
              <p className="font-bold text-ink">2. Konfirmasi Ongkir</p>
              <p className="mt-1 text-muted">
                Admin cek stok produsen &amp; input ongkir riil {order.courier}.
              </p>
            </li>
            <li className="rounded-xl border border-subtle bg-canvas p-3">
              <p className="font-bold text-ink">3. Bayar di Cek Pesanan</p>
              <p className="mt-1 text-muted">
                Setelah ongkir terisi, tombol bayar langsung aktif di halaman
                Cek Pesanan.
              </p>
            </li>
          </ol>

          <div className="flex flex-wrap gap-3">
            <Link
              href={trackUrl}
              className="min-h-11 inline-flex items-center justify-center rounded-full bg-chili px-6 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover"
            >
              Lanjut ke Pembayaran &amp; Pantau Status
            </Link>

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
                className="min-h-11 inline-flex items-center justify-center rounded-full border border-control bg-sand px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink"
              >
                {copied
                  ? "Format Pesanan Disalin"
                  : "Salin Format Pesanan (WA Admin Pending)"}
              </button>
            )}
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
            Pilih varian rasa dan ukuran Cimoring terlebih dahulu sebelum
            mengisi alamat pengiriman dan metode pembayaran.
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Checkout Pesanan
          </h1>
          <p className="mt-1.5 text-sm text-muted sm:text-base">
            Lengkapi alamat penerima, pilihan kurir, dan metode pembayaran.
            Pesanan tersimpan di perangkat Anda untuk dipantau kapan saja.
          </p>
        </div>

        <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <li className="rounded-full border border-subtle bg-sand px-3 py-1.5 text-muted">
            1. Keranjang ({totalCount})
          </li>
          <li className="rounded-full bg-ink px-3 py-1.5 text-canvas">
            2. Pengiriman &amp; Pembayaran
          </li>
          <li className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-muted">
            3. Bayar &amp; Pantau
          </li>
        </ol>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-12 lg:items-start"
      >
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-chili bg-surface p-4 text-sm font-medium text-chili-hover"
            >
              {error}
            </div>
          )}

          {/* Kartu 1: Alamat & Kontak Penerima */}
          <section className="rounded-2xl border border-subtle bg-surface p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <h2 className="font-display text-xl font-bold text-ink">
                1. Alamat Pengiriman
              </h2>
              <span className="text-xs font-semibold text-muted">
                Wajib diisi
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="customer-name"
                  className="block text-sm font-semibold text-ink"
                >
                  Nama Lengkap Penerima
                </label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Nadia Putri"
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
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="shipping-city"
                  className="block text-sm font-semibold text-ink"
                >
                  Kota / Kabupaten
                </label>
                <input
                  id="shipping-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Misal: Purwokerto / Banyumas"
                  className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
                />
              </div>

              <div>
                <label
                  htmlFor="shipping-district"
                  className="block text-sm font-semibold text-ink"
                >
                  Kecamatan
                </label>
                <input
                  id="shipping-district"
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Misal: Purwokerto Timur"
                  className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
                />
              </div>

              <div>
                <label
                  htmlFor="shipping-postal"
                  className="block text-sm font-semibold text-ink"
                >
                  Kode Pos
                </label>
                <input
                  id="shipping-postal"
                  type="text"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="53114"
                  className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="shipping-street"
                className="block text-sm font-semibold text-ink"
              >
                Alamat Lengkap &amp; Patokan
              </label>
              <textarea
                id="shipping-street"
                rows={2}
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Nama jalan, nomor rumah, RT/RW, atau patokan dekat rumah"
                className="mt-1.5 w-full rounded-md border border-control bg-canvas p-3.5 text-sm text-ink placeholder:text-muted"
              />
              <p className="mt-1 text-xs text-muted">
                Nomor WhatsApp dipakai untuk konfirmasi ongkir dan akses cek
                status pesanan tanpa harus membuat akun.
              </p>
            </div>
          </section>

          {/* Kartu 2: Daftar Produk & Opsi Pengiriman */}
          <section className="rounded-2xl border border-subtle bg-surface p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <h2 className="font-display text-xl font-bold text-ink">
                2. Produk &amp; Jasa Pengiriman
              </h2>
              <span className="text-xs font-semibold text-muted tabular-nums">
                Total {(totalWeightGrams / 1000).toFixed(2)} kg
              </span>
            </div>

            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.variantId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-subtle bg-canvas p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        item.imageUrl || "/placeholders/product-placeholder.svg"
                      }
                      alt={item.productName}
                      className="h-14 w-14 shrink-0 rounded-lg border border-subtle object-cover bg-sand"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted">
                        Kemasan {item.sizeLabel} ({Number(item.weightGrams || 250) * item.quantity} g)
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-ink tabular-nums">
                        {formatRupiah(item.sellPrice * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.variantId, item.quantity - 1)
                      }
                      aria-label={`Kurangi ${item.productName}`}
                      className="min-h-10 min-w-10 rounded-md border border-control bg-surface text-sm font-semibold text-ink hover:bg-sand"
                    >
                      -
                    </button>
                    <span className="min-w-7 text-center text-sm font-semibold text-ink tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.variantId, item.quantity + 1)
                      }
                      aria-label={`Tambah ${item.productName}`}
                      className="min-h-10 min-w-10 rounded-md border border-control bg-surface text-sm font-semibold text-ink hover:bg-sand"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-ink">
                Pilih Kurir Pengiriman
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {COURIERS.map((option) => {
                  const selected = courier === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-colors ${
                        selected
                          ? "border-forest bg-sand ring-1 ring-forest"
                          : "border-control bg-canvas hover:border-ink"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="courier"
                            value={option.id}
                            checked={selected}
                            onChange={() => setCourier(option.id)}
                            className="accent-forest"
                          />
                          <span className="text-sm font-bold text-ink">
                            {option.label}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full border border-subtle bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                          {option.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 pl-6 text-xs text-muted">
                        Estimasi {option.eta}
                      </p>
                    </label>
                  );
                })}
              </div>
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
                  placeholder="Misal: tambah kartu ucapan / kirim sore"
                  className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-canvas px-3.5 text-sm text-ink placeholder:text-muted"
                />
              </div>

              <div>
                <label
                  htmlFor="referral-code"
                  className="block text-sm font-semibold text-ink"
                >
                  Kode Reseller / Mitra (Opsional)
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
          </section>

          {/* Kartu 3: Metode Pembayaran */}
          <section className="rounded-2xl border border-subtle bg-surface p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <h2 className="font-display text-xl font-bold text-ink">
                3. Metode Pembayaran
              </h2>
              <span className="text-xs font-semibold text-forest">
                Tanpa biaya tambahan
              </span>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.id;
                return (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      selected
                        ? "border-forest bg-sand ring-1 ring-forest"
                        : "border-control bg-canvas hover:border-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selected}
                      onChange={() => setPaymentMethod(method.id)}
                      className="mt-1 accent-forest"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-ink">
                          {method.label}
                        </span>
                        <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-forest border border-subtle">
                          {method.badge}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted">
                        {method.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Ringkasan Tagihan Sticky */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28 rounded-2xl border border-subtle bg-sand p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              Ringkasan Belanja
            </h2>
            <p className="mt-1 text-xs text-muted">
              {totalCount} item dengan total berat {(totalWeightGrams / 1000).toFixed(2)} kg
            </p>
          </div>

          <dl className="space-y-2.5 border-t border-subtle pt-4 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Subtotal Produk ({totalCount} item)</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatRupiah(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Biaya Packing Aman 4 Lapis</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatRupiah(packingFee)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">
                Ongkos Kirim ({selectedCourierMeta.id})
              </dt>
              <dd className="font-semibold text-amber-ink">
                Dicek admin dulu
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Metode Pembayaran</dt>
              <dd className="font-semibold text-ink text-right">
                {selectedPaymentMeta.id === "midtrans_auto"
                  ? "Otomatis (Midtrans)"
                  : "Transfer / QRIS Manual"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-subtle pt-3 text-base">
              <dt className="font-bold text-ink">Subtotal + Packing</dt>
              <dd className="font-bold text-ink tabular-nums">
                {formatRupiah(subtotal + packingFee)}
              </dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-full bg-chili px-6 py-3 text-sm font-semibold text-white hover:bg-chili-hover disabled:opacity-60"
          >
            {submitting ? "Menyimpan Pesanan..." : "Buat Pesanan Sekarang"}
          </button>

          <div className="rounded-xl border border-subtle bg-surface p-3.5 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-ink">
              Alur Aman Wakalah bil Ujrah:
            </p>
            <p className="mt-1">
              Anda tidak perlu langsung transfer sebelum stok dan ongkir riil
              dipastikan. Jika stok habis, pesanan dapat dibatalkan tanpa biaya
              apa pun.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
