"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ReactLenis } from "lenis/react";
import { PACKING_LAYERS } from "@/lib/constants";
import { formatRupiah, normalizeWhatsapp } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import { ScrollTrack } from "./ScrollTrack";
import { OrderFlowStage } from "./OrderFlowStage";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MARQUEE_FACTS = [
  "Produksi Mandiri Sejak 2017",
  "Bersertifikat Halal & Izin PIRT",
  "Pesan Dulu, Ambil Segar Setelah Bayar",
  "Harga Website Dijaga <= Shopee",
  "Kemasan Aman 4 Lapis (Rp2.000/Order)",
  "Ekspedisi Anteraja, J&T, JNE, & Lokal",
];

const SOP_BEATS = [
  { id: 0, label: "01", targetP: 0.08 },
  { id: 1, label: "02", targetP: 0.3 },
  { id: 2, label: "03", targetP: 0.52 },
  { id: 3, label: "04", targetP: 0.74 },
  { id: 4, label: "Ringkasan", targetP: 0.94 },
];

export function LandingExperience({ products, settings }) {
  const containerRef = useRef(null);
  const lenisRef = useRef(null);
  const lastBeatRef = useRef(0);
  const { addItem } = useCart();

  const varianProducts = products.filter((p) => p.category === "varian");
  const hampersProduct = products.find((p) => p.category === "hampers");

  const [selectedProductId, setSelectedProductId] = useState(
    varianProducts[0]?.id || ""
  );
  const activeProduct =
    varianProducts.find((p) => p.id === selectedProductId) || varianProducts[0];

  const [selectedVariantId, setSelectedVariantId] = useState(
    activeProduct?.variants?.[0]?.id || ""
  );

  const activeVariant =
    activeProduct?.variants?.find((v) => v.id === selectedVariantId) ||
    activeProduct?.variants?.[0];

  const [sopBeat, setSopBeat] = useState(0);

  useEffect(() => {
    function update(time) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  const handleSopMilestone = useCallback((p) => {
    const nextBeat =
      p < 0.2 ? 0 : p < 0.42 ? 1 : p < 0.64 ? 2 : p < 0.82 ? 3 : 4;
    if (nextBeat !== lastBeatRef.current) {
      lastBeatRef.current = nextBeat;
      setSopBeat(nextBeat);
    }
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          isDesktop:
            "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          isMobile:
            "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion, isDesktop } = context.conditions;
          if (reduceMotion) return;

          // Hero masuk halus saat pertama dimuat
          gsap.from(".hero-enter", {
            y: 22,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: "power3.out",
            clearProps: "transform",
          });

          // Etalase varian muncul bertahap saat di-scroll
          gsap.from(".varian-heading-reveal", {
            y: 26,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: "#varian",
              start: "top 80%",
              once: true,
            },
          });

          gsap.from(".varian-panel-reveal", {
            y: 30,
            opacity: 0,
            duration: 0.65,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".varian-panel-reveal",
              start: "top 82%",
              once: true,
            },
          });

          gsap.from(".varian-item-reveal", {
            x: 24,
            opacity: 0,
            duration: 0.45,
            stagger: 0.09,
            ease: "power2.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: ".varian-list-wrap",
              start: "top 82%",
              once: true,
            },
          });

          // Mobile saja: inisialisasi panggung SOP pada tahap 01 agar interaksi ketuk tetap berurutan
          if (!isDesktop) {
            gsap.set(".sop-camera-track", { scale: 1.52, yPercent: 24 });
            gsap.set(
              [
                ".sop-l2-left",
                ".sop-l2-right",
                ".sop-l2-cushion",
                ".sop-l3-collar",
                ".sop-l3-tape",
                ".sop-l4-bubble",
                ".sop-l4-stamp",
                ".sop-overview-tags",
              ],
              { opacity: 0 }
            );
            gsap.set(".sop-sealer-head", { opacity: 0 });
            gsap.set(".sop-l1-strip", { opacity: 1 });
            gsap.set(".sop-progress-fill", { scaleX: 0.2 });
            gsap.set(".sop-card-focus-0", { opacity: 1, y: 0 });
            gsap.set([".sop-card-focus", ".sop-card-final"], {
              opacity: 0,
              y: 12,
            });

            // Mobile saja: tiap kartu Alur Pemesanan mengikuti scroll --s dari 0 -> 1
            gsap.utils.toArray(".cm-scene").forEach((sceneEl) => {
              gsap.fromTo(
                sceneEl,
                { "--s": 0 },
                {
                  "--s": 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: sceneEl,
                    start: "top 86%",
                    end: "top 40%",
                    scrub: 0.35,
                  },
                }
              );
            });
          }

          // Jalur reseller & hampers muncul bertahap
          gsap.from(".closing-block-reveal", {
            y: 30,
            opacity: 0,
            duration: 0.65,
            stagger: 0.16,
            ease: "power2.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: ".closing-grid",
              start: "top 82%",
              once: true,
            },
          });
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  const handleSelectProduct = contextSafe((product) => {
    setSelectedProductId(product.id);
    const firstAvailable =
      product.variants?.find((v) => v.is_available) || product.variants?.[0];
    setSelectedVariantId(firstAvailable?.id || "");

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(
        ".variant-focus-media",
        { opacity: 0.45, scale: 0.96, y: 10 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          clearProps: "transform",
        }
      );
    }
  });

  const runMobileSopTween = contextSafe((beatIdx) => {
    const cameraStates = [
      { scale: 1.52, yPercent: 24 },
      { scale: 1.32, yPercent: 2 },
      { scale: 1.14, yPercent: 0 },
      { scale: 1.04, yPercent: 0 },
      { scale: 0.94, yPercent: 0 },
    ];
    gsap.to(".sop-camera-track", {
      ...cameraStates[beatIdx],
      duration: 0.48,
      ease: "power2.out",
    });

    gsap.to(".sop-progress-fill", {
      scaleX: (beatIdx + 1) / 5,
      duration: 0.35,
      ease: "power2.out",
    });

    gsap.to(".sop-l1-strip", { opacity: 1, duration: 0.25 });
    gsap.to([".sop-l2-left", ".sop-l2-right", ".sop-l2-cushion"], {
      opacity: beatIdx >= 1 ? 1 : 0,
      duration: 0.35,
    });
    gsap.to([".sop-l3-collar", ".sop-l3-tape"], {
      opacity: beatIdx >= 2 ? 1 : 0,
      duration: 0.35,
    });
    gsap.to([".sop-l4-bubble", ".sop-l4-stamp"], {
      opacity: beatIdx >= 3 ? 1 : 0,
      duration: 0.35,
    });
    gsap.to(".sop-overview-tags", {
      opacity: beatIdx === 4 ? 1 : 0,
      duration: 0.3,
    });

    const cardSelectors = [
      ".sop-card-focus-0",
      ".sop-card-focus-1",
      ".sop-card-focus-2",
      ".sop-card-focus-3",
      ".sop-card-final",
    ];
    cardSelectors.forEach((sel, idx) => {
      const show = idx === beatIdx;
      gsap.to(sel, {
        opacity: show ? 1 : 0,
        y: show ? 0 : 12,
        duration: 0.25,
      });
    });
  });

  function handleSelectSopBeat(beatIdx) {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isDesktop && !reduceMotion) {
      const trackEl = document.getElementById("sop-kemasan");
      if (trackEl) {
        const docTop = trackEl.getBoundingClientRect().top + window.scrollY;
        const scrollable = Math.max(
          1,
          trackEl.offsetHeight - window.innerHeight + 68
        );
        const y = docTop - 68 + SOP_BEATS[beatIdx].targetP * scrollable;
        if (lenisRef.current?.lenis) {
          lenisRef.current.lenis.scrollTo(y, { duration: 0.75 });
        } else {
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        return;
      }
    }

    setSopBeat(beatIdx);
    if (!reduceMotion) {
      runMobileSopTween(beatIdx);
    }
  }

  const pirtNumber =
    settings?.pirt_number && !settings.pirt_number.startsWith("[")
      ? settings.pirt_number
      : "Terdaftar Dinas Kesehatan";
  const halalNumber =
    settings?.halal_number && !settings.halal_number.startsWith("[")
      ? settings.halal_number
      : "Tersertifikasi Halal";
  const adminWa = normalizeWhatsapp(settings?.admin_whatsapp);

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.09 }} ref={lenisRef}>
      <div ref={containerRef} className="overflow-x-clip">
        {/* 1. Hero Scroll Track: Awal fokus bersih, di-scroll muncul kartu kepercayaan bertahap */}
        <ScrollTrack
          id="hero-track"
          className="md:h-[180svh]"
          stickyClassName="md:sticky md:top-[68px] md:min-h-[calc(100svh-68px)] md:flex md:items-center"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
            <div className="grid items-center gap-6 md:grid-cols-12 lg:gap-8">
              <div className="md:col-span-6 space-y-4 lg:space-y-5">
                <h1 className="hero-enter font-display text-3xl font-bold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-5xl">
                  Cimoring Asli Sejak 2017, Dikemas Aman ke Kota Kamu.
                </h1>
                <p className="hero-enter max-w-lg text-base leading-relaxed text-muted sm:text-lg">
                  Pesan langsung dari rumah produksi tanpa potongan komisi
                  marketplace, diambil segar setelah pembayaran terverifikasi.
                </p>

                <div className="hero-enter flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/katalog"
                    className="min-h-11 inline-flex items-center gap-2 rounded-full bg-chili px-6 py-3 text-sm font-semibold text-white hover:bg-chili-hover transition-colors"
                  >
                    <span>Pilih Varian Cimoring</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/cek-pesanan"
                    className="min-h-11 inline-flex items-center rounded-full border border-control bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-sand transition-colors"
                  >
                    Cek Status &amp; Resi
                  </Link>
                </div>

                {/* Keluar bertahap saat mulai di-scroll di desktop */}
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <div
                    className="hero-scroll-fade rounded-xl border border-subtle bg-surface p-3.5"
                    style={{ "--start": 0.08, "--span": 0.25 }}
                  >
                    <p className="text-xs font-semibold text-forest">
                      Sertifikat Halal
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {halalNumber}
                    </p>
                  </div>
                  <div
                    className="hero-scroll-fade rounded-xl border border-subtle bg-surface p-3.5"
                    style={{ "--start": 0.22, "--span": 0.25 }}
                  >
                    <p className="text-xs font-semibold text-forest">
                      Izin Edar PIRT
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {pirtNumber}
                    </p>
                  </div>
                  <div
                    className="hero-scroll-fade sm:col-span-2 rounded-xl border border-subtle bg-sand p-3.5"
                    style={{ "--start": 0.38, "--span": 0.28 }}
                  >
                    <p className="text-xs font-semibold text-amber-ink">
                      Jaminan Harga &amp; Stok Segar
                    </p>
                    <p className="mt-0.5 text-sm text-ink">
                      Harga website dijaga tidak melebihi harga Shopee Cimoring,
                      stok dikonfirmasi admin maksimal 1 jam sebelum transfer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-6">
                <div className="relative overflow-hidden rounded-2xl border border-subtle bg-sand aspect-[4/3]">
                  <img
                    src="/images/hero-cimoring.jpg"
                    alt="Ilustrasi foto studio keripik Cimoring dalam kemasan standing pouch"
                    width="800"
                    height="600"
                    fetchPriority="high"
                    className="hero-photo-scale h-full w-full object-cover will-change-transform"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollTrack>

        {/* 2. Pita Fakta Marquee Berjalan */}
        <section
          aria-label="Fakta produk Cimoring"
          className="marquee-wrap border-y border-subtle bg-sand py-3.5 overflow-hidden"
        >
          <div className="marquee-track flex items-center gap-6">
            {[...MARQUEE_FACTS, ...MARQUEE_FACTS].map((fact, idx) => (
              <span
                key={`${fact}-${idx}`}
                className="inline-flex items-center gap-4 whitespace-nowrap text-sm font-semibold text-ink"
              >
                <span className="h-2 w-2 rounded-full bg-chili" aria-hidden="true" />
                <span>{fact}</span>
              </span>
            ))}
          </div>
        </section>

        {/* 3. Etalase Varian Interaktif (Muncul Bertahap Saat Scroll) */}
        <section
          id="varian"
          className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20"
        >
          <div className="varian-heading-reveal mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                Pilih Rasa &amp; Ukuran Kemasan
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                Tersedia kemasan 200 g, 250 g, 500 g, hingga bal 2 kg untuk
                camilan harian, oleh-oleh, maupun stok jual kembali.
              </p>
            </div>
            <Link
              href="/katalog"
              className="min-h-11 inline-flex items-center self-start rounded-md border border-control bg-surface px-4 text-sm font-semibold text-ink hover:bg-sand"
            >
              Lihat Semua di Katalog
            </Link>
          </div>

          {activeProduct && (
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="varian-panel-reveal lg:col-span-7 rounded-2xl border border-subtle bg-surface p-5 sm:p-7">
                <div className="grid gap-6 sm:grid-cols-12 sm:items-center">
                  <div className="variant-focus-media sm:col-span-5 overflow-hidden rounded-xl border border-subtle bg-sand aspect-[4/3]">
                    <img
                      src={
                        activeProduct.image_url ||
                        "/placeholders/product-placeholder.svg"
                      }
                      alt={`Foto ${activeProduct.name}`}
                      width="600"
                      height="450"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="sm:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-2xl font-bold text-ink">
                        {activeProduct.name}
                      </h3>
                      {activeVariant && (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            activeVariant.is_available
                              ? "bg-forest text-white"
                              : "bg-sand text-muted border border-control"
                          }`}
                        >
                          {activeVariant.is_available ? "Stok Siap" : "Kosong"}
                        </span>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-muted">
                      {activeProduct.description}
                    </p>

                    <div>
                      <p className="text-xs font-semibold text-ink">
                        Pilih Ukuran Kemasan
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(activeProduct.variants || []).map((v) => {
                          const selected = v.id === activeVariant?.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariantId(v.id)}
                              className={`min-h-11 rounded-md border px-3.5 text-sm font-semibold transition-colors ${
                                selected
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

                    {activeVariant && (
                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-subtle pt-4">
                        <div>
                          <p className="text-xs text-muted">
                            Harga Web ({activeVariant.size_label})
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

                        <button
                          type="button"
                          disabled={!activeVariant.is_available}
                          onClick={() =>
                            addItem(activeProduct, activeVariant, 1)
                          }
                          className="min-h-11 rounded-full bg-chili px-5 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover disabled:bg-sand disabled:text-muted"
                        >
                          {activeVariant.is_available
                            ? "Tambah ke Keranjang"
                            : "Belum Tersedia"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="varian-list-wrap lg:col-span-5">
                <div
                  className="space-y-2.5"
                  role="listbox"
                  aria-label="Pilih varian rasa Cimoring"
                >
                  {varianProducts.map((product) => {
                    const isSelected = product.id === activeProduct.id;
                    const anyAvailable = (product.variants || []).some(
                      (v) => v.is_available
                    );
                    const minPrice = Math.min(
                      ...(product.variants || []).map((v) => v.sell_price)
                    );
                    return (
                      <button
                        key={product.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectProduct(product)}
                        className={`varian-item-reveal flex w-full min-h-11 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-ink bg-sand"
                            : "border-subtle bg-surface hover:border-control hover:bg-canvas"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-ink">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted">
                            {anyAvailable
                              ? `Mulai ${formatRupiah(minPrice)}`
                              : "Menunggu konfirmasi stok"}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? "text-chili-hover" : "text-muted"
                          }`}
                        >
                          {isSelected ? "Aktif" : "Pilih"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. SOP Kemasan 4 Lapis (Sticky Scroll Track 310svh Berbasis --p) */}
        <ScrollTrack
          id="sop-kemasan"
          className="border-y border-subtle bg-sand md:h-[310svh]"
          stickyClassName="md:sticky md:top-[68px] md:min-h-[calc(100svh-68px)] md:flex md:items-center py-8 md:py-6"
          onMilestone={handleSopMilestone}
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                  Kemasan Empat Lapis Agar Tiba Utuh dan Renyah
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
                  Empat lapisan pelindung memastikan keripik tetap utuh sampai
                  tujuan (biaya packing Rp2.000/pesanan).
                </p>
              </div>

              <div
                className="flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Tahap SOP kemasan empat lapis"
              >
                {SOP_BEATS.map((b) => {
                  const active = sopBeat === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSelectSopBeat(b.id)}
                      className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-ink bg-ink text-canvas"
                          : "border-control bg-surface text-ink hover:bg-canvas"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12 md:items-center lg:gap-8">
              {/* Sebelah Kiri: Panggung Vektor Tema Website Taktil + Zoom --p */}
              <div className="md:col-span-6">
                <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-control bg-canvas shadow-sm md:max-w-none">
                  <div className="h-1.5 w-full bg-sand">
                    <div className="sop-progress-fill h-full w-full origin-left bg-forest will-change-transform" />
                  </div>

                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
                    <div className="sop-camera-track h-full w-full origin-center will-change-transform">
                      <svg
                        viewBox="0 0 480 360"
                        className="h-full w-full"
                        role="img"
                        aria-label="Diagram vektor perakitan kemasan empat lapis CimoFood"
                      >
                        <defs>
                          {/* Tekstur kraft halus untuk memberi kesan garis kertas nyata */}
                          <filter
                            id="cimofood-kraft"
                            x="-5%"
                            y="-5%"
                            width="110%"
                            height="110%"
                          >
                            <feTurbulence
                              type="fractalNoise"
                              baseFrequency="0.045"
                              numOctaves="2"
                              result="noise"
                            />
                            <feDisplacementMap
                              in="SourceGraphic"
                              in2="noise"
                              scale="1.2"
                            />
                          </filter>
                          <pattern
                            id="sop-bubble-grid"
                            width="16"
                            height="16"
                            patternUnits="userSpaceOnUse"
                          >
                            <circle
                              cx="8"
                              cy="8"
                              r="5.5"
                              fill="#FFFFFF"
                              fillOpacity="0.5"
                              stroke="#1F4E3D"
                              strokeOpacity="0.38"
                              strokeWidth="1"
                            />
                          </pattern>
                          <pattern
                            id="sop-kraft-flute"
                            width="6"
                            height="20"
                            patternUnits="userSpaceOnUse"
                          >
                            <line
                              x1="3"
                              y1="0"
                              x2="3"
                              y2="20"
                              stroke="#9A7446"
                              strokeOpacity="0.4"
                              strokeWidth="1.2"
                            />
                          </pattern>
                        </defs>

                        {/* Latar meja kerja */}
                        <line
                          x1="48"
                          y1="316"
                          x2="432"
                          y2="316"
                          stroke="#E5DEC9"
                          strokeWidth="2"
                        />

                        {/* Lapis 04: Bubble Wrap Outer Wipe */}
                        <g className="sop-l4-bubble sop-bubble-wipe">
                          <rect
                            x="96"
                            y="48"
                            width="288"
                            height="264"
                            rx="22"
                            fill="url(#sop-bubble-grid)"
                            stroke="#1F4E3D"
                            strokeWidth="2"
                            strokeDasharray="7 5"
                          />
                        </g>

                        {/* Lapis 03: Kardus Melingkar & Gambar Perimeter */}
                        <g
                          className="sop-l3-collar sop-step-layer"
                          style={{
                            "--start": 0.44,
                            "--span": 0.14,
                            "--from-scale": 1.12,
                          }}
                        >
                          <rect
                            x="116"
                            y="66"
                            width="248"
                            height="228"
                            rx="12"
                            fill="#E5C9A3"
                            fillOpacity="0.52"
                            filter="url(#cimofood-kraft)"
                          />
                          <rect
                            x="116"
                            y="66"
                            width="248"
                            height="228"
                            rx="12"
                            fill="none"
                            stroke="#9A4206"
                            strokeWidth="2.5"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.45, "--span": 0.15 }}
                          />
                          <line
                            x1="116"
                            y1="96"
                            x2="364"
                            y2="96"
                            stroke="#9A4206"
                            strokeOpacity="0.45"
                            strokeWidth="1.5"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.5, "--span": 0.1 }}
                          />
                          <line
                            x1="116"
                            y1="264"
                            x2="364"
                            y2="264"
                            stroke="#9A4206"
                            strokeOpacity="0.45"
                            strokeWidth="1.5"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.5, "--span": 0.1 }}
                          />
                        </g>

                        <g
                          className="sop-l3-tape sop-step-layer"
                          style={{
                            "--start": 0.54,
                            "--span": 0.09,
                            "--from-y": "-8px",
                          }}
                        >
                          <rect
                            x="184"
                            y="59"
                            width="112"
                            height="14"
                            rx="3"
                            fill="#B45309"
                          />
                        </g>

                        {/* Lapis 02: Apit Kardus Kanan dan Kiri */}
                        <g
                          className="sop-l2-left sop-step-layer"
                          style={{
                            "--start": 0.24,
                            "--span": 0.12,
                            "--from-x": "-64px",
                          }}
                        >
                          <rect
                            x="134"
                            y="82"
                            width="24"
                            height="196"
                            rx="4"
                            fill="#D4AE7D"
                            stroke="#171614"
                            strokeWidth="2"
                            filter="url(#cimofood-kraft)"
                          />
                          <rect
                            x="137"
                            y="86"
                            width="18"
                            height="188"
                            fill="url(#sop-kraft-flute)"
                          />
                        </g>
                        <g
                          className="sop-l2-right sop-step-layer"
                          style={{
                            "--start": 0.24,
                            "--span": 0.12,
                            "--from-x": "64px",
                          }}
                        >
                          <rect
                            x="322"
                            y="82"
                            width="24"
                            height="196"
                            rx="4"
                            fill="#D4AE7D"
                            stroke="#171614"
                            strokeWidth="2"
                            filter="url(#cimofood-kraft)"
                          />
                          <rect
                            x="325"
                            y="86"
                            width="18"
                            height="188"
                            fill="url(#sop-kraft-flute)"
                          />
                        </g>
                        <g
                          className="sop-l2-cushion sop-step-layer"
                          style={{ "--start": 0.32, "--span": 0.08 }}
                        >
                          <path
                            d="M114 180 L128 180 M123 175 L129 180 L123 185"
                            fill="none"
                            stroke="#1F4E3D"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.31, "--span": 0.08 }}
                          />
                          <path
                            d="M366 180 L352 180 M357 175 L351 180 L357 185"
                            fill="none"
                            stroke="#1F4E3D"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.31, "--span": 0.08 }}
                          />
                        </g>

                        {/* Inti Kemasan: Pouch Vektor Tema Website */}
                        <g>
                          <path
                            d="M174 84 H306 L312 268 C312 274 307 278 301 278 H179 C173 278 168 274 168 268 Z"
                            fill="#FAF8F4"
                            stroke="#171614"
                            strokeWidth="2.5"
                          />
                          <rect
                            x="184"
                            y="134"
                            width="112"
                            height="104"
                            rx="8"
                            fill="#F2EDE4"
                            stroke="#857D71"
                            strokeWidth="1.5"
                          />
                          <circle cx="240" cy="170" r="14" fill="#C83E2B" />
                          <text
                            x="240"
                            y="206"
                            textAnchor="middle"
                            fontFamily="Georgia, serif"
                            fontSize="15"
                            fontWeight="700"
                            fill="#171614"
                          >
                            CIMORING
                          </text>
                          <text
                            x="240"
                            y="223"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="10"
                            fontWeight="600"
                            fill="#57534E"
                          >
                            HALAL · PIRT
                          </text>
                        </g>

                        {/* Lapis 01: Garis Segel Rapat Menggambar + Kepala Sealer */}
                        <line
                          x1="175"
                          y1="96"
                          x2="305"
                          y2="96"
                          stroke="#1F4E3D"
                          strokeWidth="10"
                          strokeLinecap="round"
                          pathLength="100"
                          className="sop-l1-strip sop-draw-line"
                          style={{ "--start": 0.05, "--span": 0.11 }}
                        />
                        <g className="sop-sealer-head">
                          <rect
                            x="156"
                            y="66"
                            width="168"
                            height="22"
                            rx="5"
                            fill="#171614"
                          />
                          <rect
                            x="172"
                            y="86"
                            width="136"
                            height="4"
                            rx="1"
                            fill="#C83E2B"
                          />
                          <text
                            x="240"
                            y="81"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="10"
                            fontWeight="700"
                            fill="#FAF8F4"
                          >
                            MESIN SEALER
                          </text>
                        </g>

                        {/* Stempel Foto Bukti Lapis 04 */}
                        <g
                          className="sop-l4-stamp sop-step-layer"
                          style={{
                            "--start": 0.72,
                            "--span": 0.08,
                            "--from-scale": 1.24,
                          }}
                        >
                          <rect
                            x="264"
                            y="262"
                            width="142"
                            height="32"
                            rx="6"
                            fill="#1F4E3D"
                          />
                          <text
                            x="335"
                            y="282"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="11"
                            fontWeight="700"
                            fill="#FFFFFF"
                          >
                            SIAP KIRIM · FOTO BUKTI
                          </text>
                        </g>

                        {/* Penanda Lengkap 1-4 Saat Zoom Out Final */}
                        <g
                          className="sop-overview-tags sop-step-layer"
                          style={{ "--start": 0.84, "--span": 0.08 }}
                        >
                          <line
                            x1="240"
                            y1="53"
                            x2="240"
                            y2="92"
                            stroke="#1F4E3D"
                            strokeWidth="1.8"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.85, "--span": 0.07 }}
                          />
                          <circle cx="240" cy="40" r="13" fill="#1F4E3D" />
                          <text
                            x="240"
                            y="44"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="11"
                            fontWeight="700"
                            fill="#FFFFFF"
                          >
                            1
                          </text>

                          <line
                            x1="85"
                            y1="180"
                            x2="134"
                            y2="180"
                            stroke="#B45309"
                            strokeWidth="1.8"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.86, "--span": 0.07 }}
                          />
                          <circle cx="72" cy="180" r="13" fill="#B45309" />
                          <text
                            x="72"
                            y="184"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="11"
                            fontWeight="700"
                            fill="#FFFFFF"
                          >
                            2
                          </text>

                          <line
                            x1="395"
                            y1="128"
                            x2="364"
                            y2="128"
                            stroke="#9A4206"
                            strokeWidth="1.8"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.87, "--span": 0.07 }}
                          />
                          <circle cx="408" cy="128" r="13" fill="#9A4206" />
                          <text
                            x="408"
                            y="132"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="11"
                            fontWeight="700"
                            fill="#FFFFFF"
                          >
                            3
                          </text>

                          <line
                            x1="395"
                            y1="224"
                            x2="384"
                            y2="224"
                            stroke="#171614"
                            strokeWidth="1.8"
                            pathLength="100"
                            className="sop-draw-line"
                            style={{ "--start": 0.88, "--span": 0.07 }}
                          />
                          <circle cx="408" cy="224" r="13" fill="#171614" />
                          <text
                            x="408"
                            y="228"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="11"
                            fontWeight="700"
                            fill="#FFFFFF"
                          >
                            4
                          </text>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sebelah Kanan: Penjelasan Satu per Satu -> Terakhir Lengkap 1-4 */}
              <div className="md:col-span-6">
                <div className="grid items-start md:items-center">
                  {/* Tampilan Lengkap 1-4 */}
                  <div
                    className={`sop-card-final col-start-1 row-start-1 rounded-2xl border border-forest bg-surface p-6 sm:p-7 ${
                      sopBeat === 4 ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-subtle pb-3">
                      <h3 className="font-display text-xl font-bold text-ink">
                        Ringkasan Lengkap SOP 1 sampai 4
                      </h3>
                      <span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-white">
                        Siap Kirim
                      </span>
                    </div>

                    <ol className="mt-4 space-y-3">
                      {PACKING_LAYERS.map((layer, idx) => (
                        <li
                          key={layer.step}
                          className="sop-summary-row flex items-start gap-3 text-sm"
                          style={{
                            "--row-start": (0.83 + idx * 0.03).toFixed(2),
                          }}
                        >
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sand font-bold text-ink tabular-nums">
                            {Number(layer.step)}.
                          </span>
                          <div>
                            <p className="font-semibold text-ink">
                              {layer.title}
                            </p>
                            <p className="mt-0.5 leading-relaxed text-muted">
                              {layer.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tahap 1 -> 2 -> 3 -> 4 Fokus Satu per Satu */}
                  {PACKING_LAYERS.map((layer, idx) => {
                    const enterValues = [0, 0.19, 0.41, 0.63];
                    const leaveValues = [0.17, 0.39, 0.61, 0.79];
                    const cardClass =
                      idx === 0
                        ? "sop-card-focus-0"
                        : `sop-card-focus sop-card-focus-${idx}`;

                    return (
                      <article
                        key={layer.step}
                        aria-hidden={sopBeat !== idx}
                        style={
                          idx > 0
                            ? {
                                "--enter": enterValues[idx],
                                "--leave": leaveValues[idx],
                              }
                            : undefined
                        }
                        className={`${cardClass} col-start-1 row-start-1 rounded-2xl border border-forest bg-surface p-6 sm:p-7 ${
                          sopBeat === idx
                            ? "pointer-events-auto"
                            : "pointer-events-none"
                        }`}
                      >
                        <span className="inline-flex w-fit items-center rounded-full bg-forest px-3.5 py-1 text-xs font-semibold text-white tabular-nums">
                          Tahap {Number(layer.step)} dari 4
                        </span>
                        <h3 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
                          {Number(layer.step)}. {layer.title}
                        </h3>
                        <p className="mt-3 text-base leading-relaxed text-muted">
                          {layer.detail}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </ScrollTrack>

        {/* 5. Alur Pemesanan Berbasis Scroll 7 Adegan */}
        <OrderFlowStage
          onScrollToY={(y) => {
            if (lenisRef.current?.lenis) {
              lenisRef.current.lenis.scrollTo(y, { duration: 0.75 });
            } else {
              window.scrollTo({ top: y, behavior: "smooth" });
            }
          }}
        />

        {/* 6. Jalur Reseller & Paket Hampers */}
        <section className="mx-auto max-w-6xl border-t border-subtle px-4 pt-14 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
          <div className="closing-grid grid gap-6 lg:grid-cols-12">
            <div className="closing-block-reveal lg:col-span-7 flex flex-col justify-between rounded-2xl bg-forest p-7 text-canvas sm:p-9">
              <div className="space-y-3">
                <h2 className="font-display text-3xl font-bold text-white">
                  Ingin Jual Ulang Cimoring di Sekitarmu?
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-canvas/90 sm:text-base">
                  UMKM Cimoring melayani reseller dan dropshipper tanpa minimal
                  order dengan harga grosir khusus. Pengiriman jarak jauh tetap
                  dibantu pengemasan aman oleh tim CimoFood.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {adminWa ? (
                  <a
                    href={`https://wa.me/${adminWa}?text=${encodeURIComponent(
                      "Halo Admin CimoFood, saya tertarik menanyakan daftar harga reseller Cimoring."
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 inline-flex items-center rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-sand"
                  >
                    Tanya Daftar Harga Reseller via WA
                  </a>
                ) : (
                  <Link
                    href="/katalog"
                    className="min-h-11 inline-flex items-center rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-sand"
                  >
                    Lihat Katalog &amp; Ukuran Bal 2 kg
                  </Link>
                )}
              </div>
            </div>

            <div className="closing-block-reveal lg:col-span-5 flex flex-col justify-between rounded-2xl border border-subtle bg-sand p-7 sm:p-9">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-subtle bg-surface aspect-[4/3]">
                  <img
                    src={
                      hampersProduct?.image_url ||
                      "/images/cimoring-hampers.jpg"
                    }
                    alt="Ilustrasi paket hampers bundling Cimoring"
                    width="600"
                    height="450"
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className="font-display text-2xl font-bold text-ink">
                  {hampersProduct?.name || "Paket Hampers & Oleh-Oleh"}
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  {hampersProduct?.description ||
                    "Bundling pilihan varian rasa dengan kemasan rapi untuk hadiah, tamu kampus, atau hantaran musim liburan."}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/katalog?kategori=hampers"
                  className="min-h-11 inline-flex items-center rounded-full bg-chili px-5 py-2.5 text-sm font-semibold text-white hover:bg-chili-hover"
                >
                  Pesan Paket Hampers
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ReactLenis>
  );
}
