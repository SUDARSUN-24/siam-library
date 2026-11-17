/** Home hero: a bright bookshelf drawn in SVG (decorative, no external images). */

const spines = [
  { w: 30, h: 150, c: "var(--hue-blue)" },
  { w: 22, h: 128, c: "var(--sun)" },
  { w: 36, h: 168, c: "var(--hue-raspberry)" },
  { w: 26, h: 140, c: "var(--hue-teal)" },
  { w: 32, h: 176, c: "var(--crimson)" },
  { w: 24, h: 132, c: "var(--hue-violet)" },
];

// x position of each spine: side by side with a 4px gap, starting at 46
const placed = spines.map((b, i) => ({ ...b, x: 46 + spines.slice(0, i).reduce((sum, p) => sum + p.w + 4, 0) }));

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 320" className={className} aria-hidden="true" focusable="false">
      {/* soft shapes behind */}
      <circle cx="292" cy="128" r="112" fill="var(--sky-soft)" />
      <circle cx="96" cy="70" r="46" fill="var(--rose-soft)" />
      <circle cx="372" cy="262" r="30" fill="var(--mint-soft)" />
      <circle cx="58" cy="236" r="9" fill="var(--sun)" />
      <circle cx="378" cy="56" r="6" fill="var(--crimson)" />
      <circle cx="160" cy="34" r="5" fill="var(--hue-blue)" />

      {/* standing books */}
      {placed.map((b, i) => {
        const bx = b.x;
        const top = 262 - b.h;
        return (
          <g key={i}>
            <rect x={bx} y={top} width={b.w} height={b.h} rx="3" fill={b.c} />
            <rect x={bx} y={top + 14} width={b.w} height="5" fill="#fff" opacity=".55" />
            <rect x={bx} y={top + b.h - 22} width={b.w} height="4" fill="#fff" opacity=".45" />
            <rect x={bx + b.w / 2 - 4} y={top + 34} width="8" height={Math.min(46, b.h - 80)} rx="2" fill="#fff" opacity=".35" />
          </g>
        );
      })}
      {/* a leaning book */}
      <g transform="rotate(16 268 262)">
        <rect x="244" y="104" width="30" height="158" rx="3" fill="var(--hue-blue)" opacity=".85" />
        <rect x="244" y="118" width="30" height="5" fill="#fff" opacity=".55" />
        <rect x="244" y="236" width="30" height="4" fill="#fff" opacity=".45" />
      </g>

      {/* stack of books lying flat */}
      <rect x="300" y="236" width="92" height="26" rx="3" fill="var(--hue-orange)" />
      <rect x="300" y="245" width="92" height="4" fill="#fff" opacity=".45" />
      <rect x="308" y="212" width="80" height="24" rx="3" fill="var(--hue-teal)" />
      <rect x="308" y="221" width="80" height="4" fill="#fff" opacity=".45" />
      <rect x="302" y="190" width="86" height="22" rx="3" fill="var(--sun)" />
      <rect x="302" y="198" width="86" height="4" fill="#fff" opacity=".55" />
      {/* open book on top */}
      <path d="M345 188c-12-9-28-11-44-6v-26c16-5 32-3 44 6z" fill="#fff" stroke="var(--input)" strokeWidth="1.5" />
      <path d="M345 188c12-9 28-11 44-6v-26c-16-5-32-3-44 6z" fill="#fff" stroke="var(--input)" strokeWidth="1.5" />
      <path d="M309 168h28M309 175h24M353 168h28M357 175h24" stroke="var(--input)" strokeWidth="2" strokeLinecap="round" />

      {/* shelf */}
      <rect x="30" y="262" width="372" height="12" rx="4" fill="var(--wood)" />
      <rect x="44" y="274" width="10" height="22" rx="2" fill="var(--wood-dark)" />
      <rect x="378" y="274" width="10" height="22" rx="2" fill="var(--wood-dark)" />
    </svg>
  );
}

/** Catalogue headers: a small row of bright book spines (decorative). */
const strip = [
  { h: 92, c: "var(--hue-blue)" },
  { h: 120, c: "var(--sun)" },
  { h: 104, c: "var(--hue-raspberry)" },
  { h: 132, c: "var(--hue-teal)" },
  { h: 98, c: "var(--crimson)" },
  { h: 116, c: "var(--hue-orange)" },
  { h: 88, c: "var(--hue-violet)" },
];

export function SpineStrip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" className={className} aria-hidden="true" focusable="false">
      {strip.map((b, i) => (
        <g key={i}>
          <rect x={8 + i * 29} y={136 - b.h} width="24" height={b.h} rx="3" fill={b.c} opacity=".9" />
          <rect x={8 + i * 29} y={136 - b.h + 12} width="24" height="4" fill="#fff" opacity=".5" />
        </g>
      ))}
      <rect x="0" y="134" width="220" height="6" rx="2" fill="var(--wood)" />
    </svg>
  );
}
