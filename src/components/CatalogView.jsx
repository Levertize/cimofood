"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatRupiah } from "@/lib/pricing";
import { useCart } from "./CartProvider";

export function CatalogView({ products, packingFee }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("kategori") || "semua";

  const [category, setCategory] = useState(
    ["semua", "varian", "hampers"].includes(initialCategory)
      ? initialCategory
      : "semua"
  );
  const [query, setQuery] = useState(searchParams.get("cari") || "");
  const [selectedSizes, setSelectedSizes] = useState(() => {
    const map = {};
    for (const p of products) {
      const firstAvail =
        (p.variants || []).find((v) => v.is_available) || p.variants?.[0];
      if (firstAvail) map[p.id] = firstAvail.id;
    }
    return map;
  });

  const { addItem, totalCount, setDrawerOpen } = useCart();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "semua" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [products, category, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-subtle pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Katalog Cimoring &amp; Hampers
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            Pilih varian rasa dan ukuran kemasan yang tersedia. Biaya packing
            aman empat lapis sebesar {formatRupiah(packingFee)} dihitung sekali
            per pesanan saat checkout.
          </p>
        </div>

        {totalCount > 0 && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="min-h-11 self-start rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Lihat Keranjang ({totalCount} item)
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="Filter kategori produk" className="flex flex-wrap gap-2">
          {[
            { id: "semua", label: "Semua Produk" },
            { id: "varian", label: "Varian Rasa" },
            { id: "hampers", label: "Paket Hampers" },
          ].map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(tab.id)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "border-ink bg-ink text-canvas"
                    : "border-control bg-surface text-ink hover:bg-sand"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:max-w-xs">
          <label
            htmlFor="catalog-search"
            className="block text-xs font-semibold text-ink"
          >
            Cari varian rasa
          </label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik pedas, balado, original..."
            className="mt-1.5 min-h-11 w-full rounded-md border border-control bg-surface px-3.5 text-sm text-ink placeholder:text-muted"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-subtle bg-surface p-8 text-center">
          <p className="font-display text-xl font-bold text-ink">
            Tidak ada produk yang cocok dengan pencarian &ldquo;{query}&rdquo;.
          </p>
          <p className="mt-2 text-sm text-muted">
            Coba hapus kata kunci pencarian atau pilih kategori Semua Produk.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("semua");
            }}
            className="mt-4 min-h-11 rounded-full border border-control bg-canvas px-5 text-sm font-semibold text-ink hover:bg-sand"
          >
            Tampilkan Semua Produk
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const variants = product.variants || [];
            const selectedVar =
              variants.find((v) => v.id === selectedSizes[product.id]) ||
              variants[0];

            return (
              <article
                key={product.id}
                className="flex flex-col justify-between rounded-2xl border border-subtle bg-surface p-5"
              >
                <div>
                  <div className="overflow-hidden rounded-xl border border-subtle bg-sand">
                    <img
                      src={
                        product.image_url ||
                        "/placeholders/product-placeholder.svg"
                      }
                      alt={`Foto ${product.name}`}
                      width="600"
                      height="450"
                      className="h-auto w-full object-cover"
                    />
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-2">
                    <h2 className="font-display text-xl font-bold text-ink">
                      {product.name}
                    </h2>
                    {selectedVar && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          selectedVar.is_available
                            ? "bg-forest text-white"
                            : "border border-control bg-sand text-muted"
                        }`}
                      >
                        {selectedVar.is_available ? "Tersedia" : "Habis"}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {product.description}
                  </p>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink">
                      Ukuran Kemasan
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {variants.map((v) => {
                        const isSelected = v.id === selectedVar?.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              setSelectedSizes((prev) => ({
                                ...prev,
                                [product.id]: v.id,
                              }))
                            }
                            className={`min-h-11 rounded-md border px-3 text-xs font-semibold transition-colors ${
                              isSelected
                                ? "border-ink bg-ink text-canvas"
                                : "border-control bg-canvas text-ink hover:bg-sand"
                            }`}
                          >
                            {v.size_label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedVar && (
                  <div className="mt-5 border-t border-subtle pt-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted">
                          Harga ({selectedVar.size_label}, {selectedVar.weight_grams} g)
                        </p>
                        <p className="text-xl font-bold text-ink tabular-nums">
                          {formatRupiah(selectedVar.sell_price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!selectedVar.is_available}
                        onClick={() => addItem(product, selectedVar, 1)}
                        className="min-h-11 rounded-full bg-chili px-4 py-2 text-sm font-semibold text-white hover:bg-chili-hover disabled:bg-sand disabled:text-muted"
                      >
                        {selectedVar.is_available
                          ? "Tambah"
                          : "Stok Habis"}
                      </button>
                    </div>
                    {selectedVar.stock_note && (
                      <p className="mt-2 text-xs text-amber-ink">
                        {selectedVar.stock_note}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-10 rounded-xl border border-subtle bg-sand p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          Sudah selesai memilih varian? Lanjutkan ke checkout untuk menghitung
          estimasi dan konfirmasi stok via WhatsApp.
        </p>
        <Link
          href="/checkout"
          className="min-h-11 inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-canvas hover:opacity-90"
        >
          Menuju Halaman Checkout
        </Link>
      </div>
    </div>
  );
}
