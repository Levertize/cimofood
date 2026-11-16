"use client";

import { useCallback, useRef, useState } from "react";
import { ScrollTrack } from "./ScrollTrack";

const ORDER_BEATS = [
  { id: 0, label: "01 Pilih", start: 0, len: 0.22, targetP: 0.16 },
  { id: 1, label: "02 Konfirmasi", start: 0.19, len: 0.22, targetP: 0.36 },
  { id: 2, label: "03 Bayar", start: 0.39, len: 0.22, targetP: 0.56 },
  { id: 3, label: "04 Packing", start: 0.59, len: 0.22, targetP: 0.76 },
  { id: 4, label: "05 Kirim", start: 0.79, len: 0.21, targetP: 0.96 },
];

// Pola QRIS dekoratif 15x15 deterministik (aman SSR & hydration)
const QR_CELLS = (() => {
  const n = 15;
  let seed = 11;
  function rnd() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function finder(x, y) {
    const origins = [
      [0, 0],
      [8, 0],
      [0, 8],
    ];
    for (let k = 0; k < origins.length; k++) {
      const lx = x - origins[k][0];
      const ly = y - origins[k][1];
      if (lx >= -1 && lx <= 7 && ly >= -1 && ly <= 7) {
        if (lx < 0 || ly < 0 || lx > 6 || ly > 6) return 0;
        return lx === 0 ||
          lx === 6 ||
          ly === 0 ||
          ly === 6 ||
          (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
          ? 1
          : 0;
      }
    }
    return null;
  }

  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      cells.push(f === null ? rnd() > 0.52 : Boolean(f));
    }
  }
  return cells;
})();

function CheckMarkIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OrderFlowStage({ onScrollToY }) {
  const [activeBeat, setActiveBeat] = useState(0);
  const lastBeatRef = useRef(0);

  const handleMilestone = useCallback((p) => {
    const nextBeat =
      p < 0.2 ? 0 : p < 0.4 ? 1 : p < 0.6 ? 2 : p < 0.8 ? 3 : 4;
    if (nextBeat !== lastBeatRef.current) {
      lastBeatRef.current = nextBeat;
      setActiveBeat(nextBeat);
    }
  }, []);

  function handleSelectBeat(beatIdx) {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isDesktop && !reduceMotion) {
      const trackEl = document.getElementById("alur-pemesanan");
      if (trackEl) {
        const docTop = trackEl.getBoundingClientRect().top + window.scrollY;
        const scrollable = Math.max(
          1,
          trackEl.offsetHeight - window.innerHeight + 68
        );
        const y = docTop - 68 + ORDER_BEATS[beatIdx].targetP * scrollable;
        if (onScrollToY) {
          onScrollToY(y);
        } else {
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        return;
      }
    }

    setActiveBeat(beatIdx);
    const sceneEl = document.getElementById(`alur-scene-${beatIdx}`);
    if (sceneEl) {
      const docTop = sceneEl.getBoundingClientRect().top + window.scrollY;
      const y = Math.max(0, docTop - 84);
      if (onScrollToY) {
        onScrollToY(y);
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  }

  return (
    <ScrollTrack
      id="alur-pemesanan"
      className="cm-flow-shell border-t border-subtle bg-canvas md:h-[360svh]"
      stickyClassName="md:sticky md:top-[68px] md:min-h-[calc(100svh-68px)] md:flex md:items-center py-12 md:py-6"
      onMilestone={handleMilestone}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Alur Pemesanan Tanpa Risiko Stok Kosong
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
              Pembeli tidak perlu langsung transfer sebelum stok dan ongkir
              ekspedisi dipastikan oleh admin.
            </p>
          </div>

          <div
            className="flex flex-wrap gap-1.5 lg:shrink-0"
            role="tablist"
            aria-label="Pilih tahap alur pemesanan"
          >
            {ORDER_BEATS.map((b) => {
              const active = activeBeat === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectBeat(b.id)}
                  className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-ink bg-ink text-canvas"
                      : "border-control bg-surface text-ink hover:bg-sand"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5 hidden h-1 w-full overflow-hidden rounded-full bg-subtle md:block">
          <div className="cm-scroll-rail h-full w-full origin-left bg-chili will-change-transform" />
        </div>

        <div className="cm-stage">
          {/* Tahap 01 */}
          <article
            id="alur-scene-0"
            style={{
              "--s-start": ORDER_BEATS[0].start,
              "--s-len": ORDER_BEATS[0].len,
            }}
            className={`cm-scene first-scene${activeBeat === 0 ? " active" : ""}`}
          >
            <div className="cm-scene-copy">
              <p className="cm-eyebrow">Tahap 01</p>
              <h3 className="cm-display">Pilih Varian &amp; Ukuran</h3>
              <div className="cm-redrule" />
              <p className="cm-desc">
                Pilih rasa Cimoring dan ukuran (200 g, 250 g, 500 g, atau bal 2
                kg), lalu isi alamat dan ekspedisi pilihan.
              </p>
            </div>
            <div className="cm-mock">
              <div className="cm-scrub" style={{ "--a": 0.14 }}>
                <div className="cm-lab">Rasa</div>
                <div className="cm-row">
                  <span className="cm-sw" style={{ background: "#C83E2B" }} />
                  <span className="cm-sw" style={{ background: "#E0A030" }} />
                  <span
                    className="cm-sw cm-sw-active"
                    style={{ background: "#1F4E3D" }}
                  />
                  <span className="cm-sw" style={{ background: "#6E3B2B" }} />
                </div>
              </div>
              <div className="cm-scrub" style={{ "--a": 0.24 }}>
                <div className="cm-lab">Ukuran</div>
                <div className="cm-row">
                  <span className="cm-chip">200 g</span>
                  <span className="cm-chip">250 g</span>
                  <span
                    className="cm-chip cm-chip-target"
                    style={{ "--sel-at": 0.4 }}
                  >
                    <span>500 g</span>
                    <span className="cm-chip-fill" aria-hidden="true">
                      500 g
                    </span>
                  </span>
                  <span className="cm-chip">Bal 2 kg</span>
                </div>
              </div>
              <div className="cm-scrub" style={{ "--a": 0.34 }}>
                <div className="cm-lab">Ekspedisi</div>
                <div className="cm-row">
                  <span className="cm-chip">Anteraja</span>
                  <span
                    className="cm-chip cm-chip-target"
                    style={{ "--sel-at": 0.52 }}
                  >
                    <span>J&amp;T</span>
                    <span className="cm-chip-fill" aria-hidden="true">
                      J&amp;T
                    </span>
                  </span>
                  <span className="cm-chip">JNE</span>
                </div>
              </div>
              <div className="cm-scrub" style={{ "--a": 0.44 }}>
                <div className="cm-lab">Alamat pengiriman</div>
                <div className="cm-field">
                  <div className="cm-ln">
                    <i
                      style={{
                        "--w": "88%",
                        "--fill-at": 0.58,
                        "--fill-span": 0.12,
                      }}
                    />
                  </div>
                  <div className="cm-ln">
                    <i
                      style={{
                        "--w": "58%",
                        "--fill-at": 0.64,
                        "--fill-span": 0.12,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="cm-scrub" style={{ "--a": 0.52 }}>
                <div className="cm-cta">Kirim Pesanan</div>
              </div>
            </div>
          </article>

          {/* Tahap 02 */}
          <article
            id="alur-scene-1"
            style={{
              "--s-start": ORDER_BEATS[1].start,
              "--s-len": ORDER_BEATS[1].len,
            }}
            className={`cm-scene${activeBeat === 1 ? " active" : ""}`}
          >
            <div className="cm-scene-copy">
              <p className="cm-eyebrow cm-scrub" style={{ "--a": 0.06 }}>
                Tahap 02
              </p>
              <h3 className="cm-display cm-scrub" style={{ "--a": 0.1 }}>
                Konfirmasi Stok &amp; Ongkir via WA
              </h3>
              <div className="cm-redrule" />
              <p className="cm-desc cm-scrub" style={{ "--a": 0.16 }}>
                Admin mengecek stok ke produsen dan memberi total ongkos kirim
                lewat WhatsApp maksimal 1 jam di jam layanan.
              </p>
            </div>
            <div className="cm-mock">
              <div className="cm-chat-head cm-scrub" style={{ "--a": 0.12 }}>
                <span className="cm-avatar">A</span>
                <div>
                  <b>Admin CimoFood</b>
                  <small>Balas maks. 1 jam di jam layanan</small>
                </div>
              </div>
              <div className="cm-bub out cm-scrub" style={{ "--a": 0.24 }}>
                Halo admin, aku mau pesan. Stoknya masih ada?
              </div>
              <div className="cm-bub in cm-scrub" style={{ "--a": 0.4 }}>
                <span className="cm-ok-line">
                  <span className="cm-tick">
                    <CheckMarkIcon />
                  </span>
                  Stok aman, sudah dicek ke produsen.
                </span>
              </div>
              <div className="cm-bub in total cm-scrub" style={{ "--a": 0.56 }}>
                <b>Total pesanan + ongkir</b>
                <div className="cm-ln dark">
                  <i
                    style={{
                      "--w": "100%",
                      "--fill-at": 0.64,
                      "--fill-span": 0.12,
                    }}
                  />
                </div>
                <div className="cm-ln dark">
                  <i
                    style={{
                      "--w": "70%",
                      "--fill-at": 0.69,
                      "--fill-span": 0.12,
                    }}
                  />
                </div>
                <span className="cm-pill">Ongkir ekspedisi sudah dihitung</span>
              </div>
            </div>
          </article>

          {/* Tahap 03 */}
          <article
            id="alur-scene-2"
            style={{
              "--s-start": ORDER_BEATS[2].start,
              "--s-len": ORDER_BEATS[2].len,
            }}
            className={`cm-scene${activeBeat === 2 ? " active" : ""}`}
          >
            <div className="cm-scene-copy">
              <p className="cm-eyebrow cm-scrub" style={{ "--a": 0.06 }}>
                Tahap 03
              </p>
              <h3 className="cm-display cm-scrub" style={{ "--a": 0.1 }}>
                Transfer / QRIS &amp; Upload Bukti
              </h3>
              <div className="cm-redrule" />
              <p className="cm-desc cm-scrub" style={{ "--a": 0.16 }}>
                Setelah total cocok, transfer atau scan QRIS lalu unggah foto
                bukti pembayaran di halaman Cek Pesanan.
              </p>
            </div>
            <div className="cm-mock">
              <div className="cm-pay cm-scrub" style={{ "--a": 0.12 }}>
                <div className="cm-qrwrap">
                  <div className="cm-qr">
                    {QR_CELLS.map((on, i) => (
                      <i key={i} className={on ? "on" : undefined} />
                    ))}
                  </div>
                  <i className="cm-scan" />
                </div>
                <div className="cm-paytxt">
                  <b>Scan QRIS</b>
                  <small>atau transfer bank</small>
                </div>
              </div>
              <div className="cm-drop cm-scrub" style={{ "--a": 0.34 }}>
                <div className="cm-lab" style={{ margin: 0 }}>
                  Cek Pesanan · Upload bukti
                </div>
                <div className="cm-file">
                  <span className="cm-fic">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <circle cx="9" cy="10" r="1.8" />
                      <path d="M4 18l5-5 4 4 3-3 4 4" />
                    </svg>
                  </span>
                  <div className="cm-fmeta">
                    <b>bukti-pembayaran.jpg</b>
                    <div className="cm-bar">
                      <i
                        style={{
                          "--w": "100%",
                          "--fill-at": 0.48,
                          "--fill-span": 0.24,
                        }}
                      />
                    </div>
                  </div>
                  <span className="cm-tick done">
                    <CheckMarkIcon />
                  </span>
                </div>
                <div
                  className="cm-status cm-scrub"
                  style={{ "--a": 0.72, "--b": 0.12 }}
                >
                  Bukti terunggah, menunggu verifikasi admin
                </div>
              </div>
            </div>
          </article>

          {/* Tahap 04 */}
          <article
            id="alur-scene-3"
            style={{
              "--s-start": ORDER_BEATS[3].start,
              "--s-len": ORDER_BEATS[3].len,
            }}
            className={`cm-scene${activeBeat === 3 ? " active" : ""}`}
          >
            <div className="cm-scene-copy">
              <p className="cm-eyebrow cm-scrub" style={{ "--a": 0.06 }}>
                Tahap 04
              </p>
              <h3 className="cm-display cm-scrub" style={{ "--a": 0.1 }}>
                Ambil Barang Segar &amp; Packing SOP
              </h3>
              <div className="cm-redrule" />
              <p className="cm-desc cm-scrub" style={{ "--a": 0.16 }}>
                Tim mengambil produk langsung dari Cimoring setelah pembayaran
                terverifikasi, lalu mengemas sesuai SOP 4 lapis.
              </p>
            </div>
            <div className="cm-mock">
              <div className="cm-chip ok cm-scrub" style={{ "--a": 0.1 }}>
                <span className="cm-tick">
                  <CheckMarkIcon />
                </span>
                Pembayaran terverifikasi
              </div>
              <div className="cm-packrow">
                <svg
                  className="cm-pack"
                  viewBox="0 0 200 200"
                  aria-hidden="true"
                >
                  <rect
                    className="cm-L4 cm-layer-pop"
                    style={{ "--at": 0.6 }}
                    x="4"
                    y="4"
                    width="192"
                    height="192"
                    rx="26"
                  />
                  <rect
                    className="cm-L3 cm-layer-pop"
                    style={{ "--at": 0.47 }}
                    x="28"
                    y="28"
                    width="144"
                    height="144"
                    rx="20"
                  />
                  <rect
                    className="cm-L2 cm-layer-pop"
                    style={{ "--at": 0.34 }}
                    x="52"
                    y="52"
                    width="96"
                    height="96"
                    rx="15"
                  />
                  <rect
                    className="cm-L1 cm-layer-pop"
                    style={{ "--at": 0.21 }}
                    x="72"
                    y="72"
                    width="56"
                    height="56"
                    rx="11"
                  />
                  <text
                    className="cm-ptx cm-layer-pop"
                    style={{ "--at": 0.21 }}
                    x="100"
                    y="111"
                    textAnchor="middle"
                  >
                    C
                  </text>
                </svg>
                <ul className="cm-layers">
                  {[
                    ["1", "Lapis 1 · Sealer", 0.21],
                    ["2", "Lapis 2 · Kardus apit", 0.34],
                    ["3", "Lapis 3 · Kardus luar", 0.47],
                    ["4", "Lapis 4 · Bubble wrap", 0.6],
                  ].map(([no, text, at]) => (
                    <li key={no} className="cm-scrub" style={{ "--a": at }}>
                      <span className="n">{no}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cm-scrub" style={{ "--a": 0.72, "--b": 0.12 }}>
                <span className="cm-pill">Siap kirim, sesuai SOP</span>
              </div>
            </div>
          </article>

          {/* Tahap 05 */}
          <article
            id="alur-scene-4"
            style={{
              "--s-start": ORDER_BEATS[4].start,
              "--s-len": ORDER_BEATS[4].len,
            }}
            className={`cm-scene last-scene${activeBeat === 4 ? " active" : ""}`}
          >
            <div className="cm-scene-copy">
              <p className="cm-eyebrow cm-scrub" style={{ "--a": 0.06 }}>
                Tahap 05
              </p>
              <h3 className="cm-display cm-scrub" style={{ "--a": 0.1 }}>
                Kirim Paket &amp; Pantau Resi
              </h3>
              <div className="cm-redrule" />
              <p className="cm-desc cm-scrub" style={{ "--a": 0.16 }}>
                Nomor resi Anteraja, J&amp;T, atau JNE diinput admin agar bisa
                kamu pantau hingga paket tiba renyah.
              </p>
            </div>
            <div className="cm-mock">
              <div className="cm-scrub" style={{ "--a": 0.12 }}>
                <div className="cm-lab">Ekspedisi</div>
                <div className="cm-row">
                  <span className="cm-chip">Anteraja</span>
                  <span
                    className="cm-chip cm-chip-target"
                    style={{ "--sel-at": 0.22 }}
                  >
                    <span>J&amp;T</span>
                    <span className="cm-chip-fill" aria-hidden="true">
                      J&amp;T
                    </span>
                  </span>
                  <span className="cm-chip">JNE</span>
                </div>
              </div>
              <div className="cm-scrub" style={{ "--a": 0.22 }}>
                <div className="cm-tagrow">
                  <div className="cm-lab">Nomor resi</div>
                  <span className="cm-pill">Diinput admin</span>
                </div>
                <div className="cm-resi">
                  <span className="cm-mono">••••••••••••</span>
                </div>
              </div>
              <div className="cm-track cm-scrub" style={{ "--a": 0.36 }}>
                <div className="cm-rail">
                  <i className="cm-fill" />
                  <span className="cm-truck">
                    <svg viewBox="0 0 36 22" aria-hidden="true">
                      <rect
                        x="0"
                        y="1"
                        width="23"
                        height="14"
                        rx="2.5"
                        fill="currentColor"
                      />
                      <path d="M25 5h6l4 5v5H25z" fill="#C83E2B" />
                      <circle
                        cx="8"
                        cy="17"
                        r="3.4"
                        fill="var(--cm-card)"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle
                        cx="29"
                        cy="17"
                        r="3.4"
                        fill="var(--cm-card)"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </span>
                </div>
                <div className="cm-nodes">
                  <div className="cm-nd">
                    <span className="cm-dot">
                      <b className="cm-dot-lit" style={{ "--dot-at": 0.44 }} />
                    </span>
                    Dikemas
                  </div>
                  <div className="cm-nd">
                    <span className="cm-dot">
                      <b className="cm-dot-lit" style={{ "--dot-at": 0.62 }} />
                    </span>
                    Dalam perjalanan
                  </div>
                  <div className="cm-nd">
                    <span className="cm-dot">
                      <b className="cm-dot-lit" style={{ "--dot-at": 0.78 }} />
                    </span>
                    Tiba renyah
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </ScrollTrack>
  );
}
