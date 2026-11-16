import { useId } from "react";

export function DoodleBackdrop() {
  const rawId = useId();
  const patternId = `cimofood-doodle-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Pola Doodles Kuliner Jarang & Tenang ala Wallpaper Chat */}
      <svg
        className="doodle-pattern-layer absolute -inset-24 h-[calc(100%+192px)] w-[calc(100%+192px)] opacity-[0.038]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={patternId}
            width="440"
            height="440"
            patternUnits="userSpaceOnUse"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* 1. Pouch Cimoring kecil (52, 48) */}
              <g transform="translate(52, 48) rotate(-12 14 14) scale(0.62)">
                <path d="M8 6 H36 L40 48 C40 52 37 54 33 54 H11 C7 54 4 52 4 48 Z" />
                <line x1="7" y1="14" x2="37" y2="14" />
                <circle cx="22" cy="31" r="7" />
                <path d="M24 28 C21 26 18 28 18 31 C18 34 21 36 24 34" />
              </g>

              {/* 2. Cabai melengkung kecil (276, 56) */}
              <g transform="translate(276, 56) rotate(18 14 14) scale(0.65)">
                <path d="M12 6 C14 2 18 2 20 5" />
                <path d="M12 9 C22 10 29 22 25 36 C24 39 20 39 19 36 C21 25 16 17 9 15 C7 14 7 9 12 9 Z" />
              </g>

              {/* 3. Kepingan Keripik Cimoring (168, 176) */}
              <g transform="translate(168, 176) rotate(10 14 14) scale(0.6)">
                <path d="M24 4 C35 4 44 12 43 24 C42 36 33 44 21 43 C9 42 4 33 5 22 C6 11 13 4 24 4 Z" />
                <path d="M12 29 C16 32 22 33 27 32" />
              </g>

              {/* 4. Daun jeruk kecil (364, 204) */}
              <g transform="translate(364, 204) rotate(-16 14 14) scale(0.62)">
                <path d="M20 40 V12" />
                <path d="M20 24 C10 24 8 15 14 11 C17 9 20 12 20 12 C20 12 23 9 26 11 C32 15 30 24 20 24 Z" />
                <path d="M20 35 C12 35 10 28 16 25 C18 24 20 26 20 26 C20 26 22 24 24 25 C30 28 28 35 20 35 Z" />
              </g>

              {/* 5. Mangkok camilan kecil (72, 320) */}
              <g transform="translate(72, 320) rotate(8 14 14) scale(0.62)">
                <path d="M6 24 H42 C41 35 34 42 24 42 C14 42 7 35 6 24 Z" />
                <path d="M15 42 H33" />
                <path d="M12 24 C14 17 20 16 24 20 C28 15 35 17 36 24" />
              </g>

              {/* 6. Kotak paket kecil (292, 332) */}
              <g transform="translate(292, 332) rotate(-10 14 14) scale(0.62)">
                <rect x="6" y="12" width="36" height="30" rx="4" />
                <path d="M19 12 V24 H29 V12" />
                <line x1="6" y1="20" x2="42" y2="20" />
              </g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Partikel mikro: jarang, kecil, berkedip pelan, parallax 3 kedalaman */}
      {SPARK_LAYERS.map((layer) => (
        <div
          key={layer.id}
          className="spark-layer"
          style={{ "--sy": `${layer.sy}px` }}
        >
          {layer.items.map((s) => (
            <span
              key={`${layer.id}-${s.x}-${s.y}`}
              className={`spark${s.hideOnMobile ? " hidden md:block" : ""}`}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                color: s.color,
                "--dur": `${s.dur}s`,
                "--delay": `${s.delay}s`,
              }}
            >
              <SparkShape type={s.type} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const CHILI = "var(--accent-chili)";
const AMBER = "var(--brand-amber-ink)";
const FOREST = "var(--brand-forest)";

const SPARK_LAYERS = [
  {
    id: "far",
    sy: -36,
    items: [
      { x: 6, y: 14, type: "spark", size: 10, color: CHILI, dur: 4.2, delay: 0 },
      { x: 22, y: 78, type: "crumb", size: 8, color: AMBER, dur: 5.1, delay: 1.2 },
      { x: 47, y: 9, type: "seed", size: 10, color: FOREST, dur: 6, delay: 0.6 },
      { x: 71, y: 86, type: "spark", size: 9, color: AMBER, dur: 4.6, delay: 2 },
      { x: 93, y: 20, type: "crumb", size: 8, color: CHILI, dur: 5.4, delay: 0.3 },
      { x: 84, y: 52, type: "seed", size: 9, color: AMBER, dur: 5.8, delay: 1.6, hideOnMobile: true },
    ],
  },
  {
    id: "mid",
    sy: -84,
    items: [
      { x: 12, y: 44, type: "chili", size: 16, color: CHILI, dur: 6.5, delay: 0 },
      { x: 35, y: 90, type: "spark", size: 13, color: AMBER, dur: 4.8, delay: 1 },
      { x: 58, y: 22, type: "leaf", size: 15, color: FOREST, dur: 7, delay: 0.4 },
      { x: 90, y: 76, type: "chili", size: 15, color: CHILI, dur: 6.2, delay: 2.2, hideOnMobile: true },
      { x: 3, y: 88, type: "leaf", size: 14, color: FOREST, dur: 7.4, delay: 1.4, hideOnMobile: true },
    ],
  },
  {
    id: "near",
    sy: -150,
    items: [
      { x: 28, y: 26, type: "spark", size: 15, color: CHILI, dur: 5, delay: 0.8 },
      { x: 64, y: 60, type: "crumb", size: 12, color: AMBER, dur: 5.6, delay: 0.1, hideOnMobile: true },
      { x: 96, y: 40, type: "leaf", size: 16, color: FOREST, dur: 7.2, delay: 1.8, hideOnMobile: true },
      { x: 18, y: 62, type: "ring", size: 14, color: AMBER, dur: 6, delay: 2.6 },
      { x: 76, y: 8, type: "spark", size: 12, color: AMBER, dur: 4.4, delay: 1.1 },
    ],
  },
];

function SparkShape({ type }) {
  switch (type) {
    case "crumb":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M5 13 C4 8 9 4 14 6 C19 7 21 12 18 16 C15 20 8 19 5 13 Z"
            fill="currentColor"
          />
        </svg>
      );
    case "seed":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <ellipse
            cx="12"
            cy="12"
            rx="5"
            ry="8"
            fill="currentColor"
            transform="rotate(30 12 12)"
          />
        </svg>
      );
    case "chili":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M9 5 C9 3 11 3 12 4 C18 6 21 14 19 20 C18 22 16 21 16 19 C16 14 13 10 9 9 Z"
            fill="currentColor"
          />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 22 V6 M12 14 C6 14 4 8 8 5 C10 4 12 6 12 6 C12 6 14 4 16 5 C20 8 18 14 12 14 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ring":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}
