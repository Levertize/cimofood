const PALETTES = {
  pedas: {
    body: "#C83E2B",
    dark: "#8F2619",
    light: "#E8664F",
    panel: "#FFF4E8",
    ink: "#2A1410",
    accent: "#C83E2B",
    motif: "chili",
  },
  balado: {
    body: "#B3401F",
    dark: "#7C2A12",
    light: "#D9692F",
    panel: "#FFF1E4",
    ink: "#2A1410",
    accent: "#D9692F",
    motif: "tomato",
  },
  original: {
    body: "#D9A441",
    dark: "#8A6118",
    light: "#EBC36E",
    panel: "#FFFBEF",
    ink: "#2B2210",
    accent: "#D9A441",
    motif: "wheat",
  },
  barbecue: {
    body: "#7A3B1E",
    dark: "#4D2210",
    light: "#A9582C",
    panel: "#FFF1E2",
    ink: "#25140A",
    accent: "#A9582C",
    motif: "flame",
  },
  "balado-asin": {
    body: "#B8324A",
    dark: "#7E1F31",
    light: "#DB5A70",
    panel: "#FFF0F2",
    ink: "#2A1218",
    accent: "#DB5A70",
    motif: "salt",
  },
  default: {
    body: "#1F4E3D",
    dark: "#123327",
    light: "#2F7459",
    panel: "#F4FBF7",
    ink: "#10241B",
    accent: "#2F7459",
    motif: "leaf",
  },
};

export function getFlavorPalette(slug) {
  return PALETTES[slug] || PALETTES.default;
}

export function flavorLabel(name) {
  const cleaned = String(name || "")
    .replace(/^cimoring\s+/i, "")
    .trim();
  return cleaned || String(name || "");
}

function Motif({ type, fill, stroke, soft }) {
  switch (type) {
    case "chili":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M112 66 C124 64 138 74 138 94 C138 101 131 101 130 95 C128 84 120 78 112 78 C108 78 108 66 112 66 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
          <path
            d="M112 66 C110 61 114 58 118 60"
            fill="none"
            stroke={stroke}
            strokeWidth="2"
          />
        </g>
      );
    case "tomato":
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <circle
            cx="120"
            cy="84"
            r="15"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
          <path
            d="M120 70 L112 65 L120 67 L128 65 Z"
            fill={soft}
            stroke={stroke}
            strokeWidth="1.6"
          />
          <path
            d="M111 82 C112 77 115 75 118 75"
            fill="none"
            stroke={soft}
            strokeWidth="2"
            opacity="0.8"
          />
        </g>
      );
    case "wheat":
      return (
        <g strokeLinecap="round">
          <path d="M120 104 V62" fill="none" stroke={stroke} strokeWidth="2" />
          <ellipse cx="120" cy="58" rx="3.6" ry="6.5" fill={fill} stroke={stroke} strokeWidth="1.6" />
          {[68, 79, 90].map((y) => (
            <g key={y}>
              <ellipse
                cx="112.5"
                cy={y}
                rx="3.6"
                ry="6.5"
                fill={fill}
                stroke={stroke}
                strokeWidth="1.6"
                transform={`rotate(-30 112.5 ${y})`}
              />
              <ellipse
                cx="127.5"
                cy={y}
                rx="3.6"
                ry="6.5"
                fill={fill}
                stroke={stroke}
                strokeWidth="1.6"
                transform={`rotate(30 127.5 ${y})`}
              />
            </g>
          ))}
        </g>
      );
    case "flame":
      return (
        <g strokeLinejoin="round">
          <path
            d="M120 58 C131 70 139 78 135 93 C132 102 108 102 105 93 C101 83 113 78 115 68 C116 64 118 61 120 58 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
          <path
            d="M120 78 C126 86 128 92 124 97 C121 100 117 100 115 97 C112 92 117 85 120 78 Z"
            fill={soft}
            opacity="0.8"
          />
        </g>
      );
    case "salt":
      return (
        <g stroke={stroke} strokeWidth="1.4" strokeLinejoin="round">
          {[
            [108, 64, 18],
            [126, 62, -12],
            [116, 80, 30],
            [133, 82, 10],
            [105, 94, -25],
            [124, 96, 20],
          ].map(([x, y, a]) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="8"
              height="8"
              rx="1.6"
              fill={fill}
              transform={`rotate(${a} ${x + 4} ${y + 4})`}
            />
          ))}
        </g>
      );
    default:
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M120 104 V62" fill="none" stroke={stroke} strokeWidth="2" />
          <path
            d="M120 84 C106 84 102 70 110 64 C115 61 120 66 120 66 C120 66 125 61 130 64 C138 70 134 84 120 84 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
        </g>
      );
  }
}

export function FlavorPouch({ slug, label, className }) {
  const pal = getFlavorPalette(slug);
  const zigzag = Array.from({ length: 19 }, (_, i) => {
    const x = (46 + i * 8.2).toFixed(1);
    const y = i % 2 === 0 ? 36 : 26;
    return `${i === 0 ? "M" : "L"}${x} ${y}`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 240 320"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="120" cy="309" rx="76" ry="8" fill="#000000" opacity="0.14" />
      <path
        d="M44 40 H196 L206 288 C206 298 198 304 188 304 H52 C42 304 34 298 34 288 Z"
        fill={pal.body}
        stroke={pal.dark}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M52 52 H68 L62 292 H48 Z" fill={pal.light} opacity="0.35" />
      <path d="M196 52 H186 L192 292 H202 Z" fill={pal.dark} opacity="0.28" />
      <rect x="40" y="18" width="160" height="26" rx="5" fill={pal.dark} />
      <path
        d={zigzag}
        fill="none"
        stroke={pal.light}
        strokeOpacity="0.65"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Motif type={pal.motif} fill={pal.light} stroke={pal.dark} soft={pal.panel} />
      <rect
        x="58"
        y="112"
        width="124"
        height="124"
        rx="16"
        fill={pal.panel}
        stroke={pal.dark}
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <circle cx="120" cy="143" r="17" fill={pal.dark} />
      <text
        x="120"
        y="150"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="21"
        fontWeight="700"
        fill="#FFFFFF"
      >
        C
      </text>
      <text
        x="120"
        y="184"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="16"
        fontWeight="700"
        fill={pal.ink}
      >
        CIMORING
      </text>
      <text
        x="120"
        y="203"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.2"
        fill={pal.dark}
      >
        {String(label || "").toUpperCase()}
      </text>
      <text
        x="120"
        y="224"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="8"
        fontWeight="700"
        letterSpacing="1"
        fill={pal.ink}
        opacity="0.65"
      >
        HALAL · PIRT
      </text>
      <path
        d="M56 266 H184"
        stroke={pal.light}
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeDasharray="4 5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FlavorMini({ slug, className }) {
  const pal = getFlavorPalette(slug);
  return (
    <svg
      viewBox="84 50 72 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="84" y="50" width="72" height="64" rx="14" fill={pal.body} />
      <Motif type={pal.motif} fill={pal.panel} stroke={pal.dark} soft={pal.body} />
    </svg>
  );
}

export function Crumb({ type }) {
  switch (type) {
    case "chili":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M9 5 C9 3 11 3 12 4 C18 6 21 14 19 20 C18 22 16 21 16 19 C16 14 13 10 9 9 Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 22 V6 M12 14 C6 14 4 8 8 5 C10 4 12 6 12 6 C12 6 14 4 16 5 C20 8 18 14 12 14 Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path
            d="M24 4 C35 4 44 12 43 24 C42 36 33 44 21 43 C9 42 4 33 5 22 C6 11 13 4 24 4 Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <circle cx="18" cy="19" r="1.8" fill="currentColor" />
          <circle cx="29" cy="18" r="1.6" fill="currentColor" />
          <circle cx="23" cy="29" r="1.9" fill="currentColor" />
        </svg>
      );
  }
}
