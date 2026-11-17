/**
 * Colour helpers for shelf colours (stored per shelf in the database as "#rrggbb").
 * Pure functions — safe in server and client components.
 */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return Number.isNaN(n) ? [29, 36, 51] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const hex = (c: [number, number, number]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * `color` as TEXT (or as a background for text in `bg`) that passes WCAG AA (4.5:1) against `bg`:
 * unchanged when it already does, otherwise darkened just enough.
 */
export function readableOn(color: string, bg: string) {
  const base = rgb(color);
  for (let k = 0; k <= 1; k += 0.05) {
    const c = hex(base.map((v) => v * (1 - k)) as [number, number, number]);
    if (contrast(c, bg) >= 4.5) return c;
  }
  return "#1d2433";
}

/**
 * The shelf colour as a background for WHITE text: unchanged when it already passes WCAG AA
 * (true for the library's shelves A/B/C), otherwise darkened just enough.
 */
export function shelfInk(color: string) {
  return readableOn(color, "#ffffff");
}

/** A light tint of a colour (mixed with white) — for bright, soft section backgrounds. */
export function tint(color: string, amount = 0.88) {
  return hex(rgb(color).map((v) => v + (255 - v) * amount) as [number, number, number]);
}
