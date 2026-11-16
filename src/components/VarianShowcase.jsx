"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import { ScrollTrack } from "./ScrollTrack";
import {
  Crumb,
  FlavorMini,
  FlavorPouch,
  flavorLabel,
  getFlavorPalette,
} from "./FlavorArt";

// Remah dekoratif di sekeliling kantong; dx/dy/r dipakai untuk parallax saat scroll
const CRUMBS = [
  { type: "chip", left: "7%", top: "13%", size: "13%", dx: 26, dy: -52, r: 40, d: "0s" },
  { type: "chili", left: "78%", top: "11%", size: "10%", dx: -20, dy: -40, r: -30, d: "0.8s" },
  { type: "leaf", left: "84%", top: "60%", size: "10%", dx: -30, dy: -68, r: 28, d: "1.6s" },
  { type: "chip", left: "9%", top: "68%", size: "9%", dx: 24, dy: -58, r: -50, d: "2.2s" },
  { type: "spark", left: "64%", top: "84%", size: "6%", dx: -14, dy: -34, r: 90, d: "0.4s" },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

export function VarianShowcase({ products, onScrollToY }) {
  const items = products.filter((p) => p.category === "varian");
  const count = Math.max(1, items.length);
  const { addItem } = useCart();

  const [activeIdx, setActiveIdx] = useState(0);
  const [sizeByProduct, setSizeByProduct] = useState({});
  const lastIdxRef = useRef(0);

  const handleMilestone = useCallback(
    (p) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const idx = Math.min(count - 1, Math.floor(p * count));
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        setActiveIdx(idx);
      }
    },
    [count]
  );

  function handleSelectFlavor(idx) {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isDesktop && !reduceMotion) {
      const trackEl = document.getElementById("varian");
      if (trackEl) {
        const docTop = trackEl.getBoundingClientRect().top + window.scrollY;
        const scrollable = Math.max(
          1,
          trackEl.offsetHeight - window.innerHeight + 68
        );
        const y = docTop - 68 + ((idx + 0.5) / count) * scrollable;
        if (onScrollToY) {
          onScrollToY(y);
        } else {
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        return;
      }
    }

    lastIdxRef.current = idx;
    setActiveIdx(idx);
  }

  if (items.length === 0) return null;

  const activeProduct = items[Math.min(activeIdx, items.length - 1)];
  const variants = activeProduct.variants || [];
  const activeVariant =
    variants.find((v) => v.id === sizeByProduct[activeProduct.id]) ||
    variants.find((v) => v.is_available) ||
    variants[0];
  const activeLabel = flavorLabel(activeProduct.name);

  return (
    <ScrollTrack
      id="varian"
      className="md:h-[420svh]"
      stickyClassName="md:sticky md:top-[68px] md:min-h-[calc(100svh-68px)] md:flex md:items-center py-12 md:py-6"
      onMilestone={handleMilestone}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Pilih Rasa &amp; Ukuran Kemasan
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
              Tersedia kemasan 200 g, 250 g, 500 g, hingga bal 2 kg untuk
              camilan harian, oleh-oleh, maupun stok jual kembali.
            </p>
          </div>
          <Link
            href="/katalog?kategori=varian"
            className="min-h-11 inline-flex items-center self-start rounded-md border border-control bg-surface px-4 text-sm font-semibold text-ink hover:bg-sand md:shrink-0"
          >
            Lihat Semua di Katalog
          </Link>
        </div>

        <div className="mb-5 hidden h-1 w-full overflow-hidden rounded-full bg-subtle md:block">
          <div className="vr-rail h-full w-full origin-left bg-chili will-change-transform" />
        </div>

        <div className="grid gap-6 md:grid-cols-12 md:items-center lg:gap-8">
          {/* Panggung kantong: tiap rasa digeser masuk/keluar mengikuti scroll */}
          <div className="md:col-span-5">
            <div
              className="vr-stage relative mx-auto aspect-square w-[min(100%,26rem,52svh)] overflow-hidden rounded-3xl border border-subtle bg-sand"
              style={{ "--n": count }}
            >
              <svg
                className="vr-ring pointer-events-none absolute left-1/2 top-1/2 h-[84%] w-[84%] text-muted"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                  strokeWidth="0.5"
                  strokeDasharray="1.6 2.4"
                  strokeLinecap="round"
                />
              </svg>

              {items.map((p, i) => {
                const pal = getFlavorPalette(p.slug);
                return (
                  <div
                    key={p.id}
                    className={`vr-slot${i === activeIdx ? " is-active" : ""}`}
                    style={{ "--i": i, color: pal.accent }}
                    aria-hidden={i !== activeIdx}
                  >
                    <span
                      className="vr-blob"
                      style={{ background: pal.accent }}
                    />
                    {CRUMBS.map((c) => (
                      <span
                        key={`${c.type}-${c.left}`}
                        className="vr-chip"
                        style={{
                          left: c.left,
                          top: c.top,
                          width: c.size,
                          "--dx": `${c.dx}px`,
                          "--dy": `${c.dy}px`,
                          "--r": `${c.r}deg`,
                          "--d": c.d,
                        }}
                      >
                        <Crumb type={c.type} />
                      </span>
                    ))}
                    <div className="vr-float">
                      <FlavorPouch
                        slug={p.slug}
                        label={flavorLabel(p.name)}
                        className="vr-pouch"
                      />
                    </div>
                  </div>
                );
              })}

              <span className="absolute left-3 top-3 z-10 rounded-full border border-subtle bg-surface px-3 py-1 text-xs font-semibold text-ink tabular-nums">
                {pad(Math.min(activeIdx, items.length - 1) + 1)} / {pad(count)}
              </span>

              {activeProduct.image_url && (
                <div
                  key={activeProduct.id}
                  className="vr-photo absolute bottom-3 right-3 z-10 w-[26%] overflow-hidden rounded-xl border border-subtle bg-surface shadow-sm"
                >
                  <img
                    src={activeProduct.image_url}
                    alt={`Foto ${activeProduct.name}`}
                    width="300"
                    height="225"
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Detail rasa aktif + pilihan ukuran dari data katalog */}
          <div className="space-y-4 md:col-span-7">
            <div
              key={activeProduct.id}
              className="vr-detail rounded-2xl border border-subtle bg-surface p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-2xl font-bold text-ink">
                  {activeProduct.name}
                </h3>
                {activeVariant && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      activeVariant.is_available
                        ? "bg-forest text-white"
                        : "border border-control bg-sand text-muted"
                    }`}
                  >
                    {activeVariant.is_available ? "Stok Siap" : "Kosong"}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {activeProduct.description}
              </p>

              <div className="mt-4">
                <p className="text-xs font-semibold text-ink">
                  Pilih Ukuran Kemasan
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {variants.map((v) => {
                    const selected = v.id === activeVariant?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setSizeByProduct((prev) => ({
                            ...prev,
                            [activeProduct.id]: v.id,
                          }))
                        }
                        className={`min-h-11 rounded-xl border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-ink bg-ink text-canvas"
                            : "border-control bg-canvas text-ink hover:bg-sand"
                        } ${v.is_available ? "" : "opacity-70"}`}
                      >
                        <span className="block text-sm font-semibold">
                          {v.size_label}
                        </span>
                        <span className="block text-xs tabular-nums">
                          {v.is_available
                            ? formatRupiah(v.sell_price)
                            : "Belum tersedia"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeVariant && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-subtle pt-4">
                  <div>
                    <p className="text-xs text-muted">
                      Harga Web ({activeVariant.size_label},{" "}
                      {activeVariant.weight_grams} g)
                    </p>
                    <p className="text-2xl font-bold text-ink tabular-nums">
                      {formatRupiah(activeVariant.sell_price)}
                    </p>
                    {activeVariant.stock_note && (
                      <p className="text-xs text-amber-ink">
                        Catatan: {activeVariant.stock_note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/katalog?kategori=varian&cari=${encodeURIComponent(
                        activeLabel.toLowerCase()
                      )}`}
                      className="min-h-11 inline-flex items-center rounded-full border border-control bg-surface px-4 text-sm font-semibold text-ink hover:bg-sand"
                    >
                      Lihat di Katalog
                    </Link>
                    <button
                      type="button"
                      disabled={!activeVariant.is_available}
                      onClick={() => addItem(activeProduct, activeVariant, 1)}
                      className="min-h-11 rounded-full bg-chili px-5 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover disabled:bg-sand disabled:text-muted"
                    >
                      {activeVariant.is_available
                        ? "Tambah ke Keranjang"
                        : "Belum Tersedia"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Pilih varian rasa Cimoring"
            >
              {items.map((p, i) => {
                const active = i === activeIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSelectFlavor(i)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border py-1.5 pl-2 pr-3.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-ink bg-ink text-canvas"
                        : "border-control bg-surface text-ink hover:bg-sand"
                    }`}
                  >
                    <FlavorMini slug={p.slug} className="h-7 w-8 shrink-0" />
                    <span>{flavorLabel(p.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ScrollTrack>
  );
}
