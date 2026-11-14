import { cn } from "@/lib/utils";

type Props = {
  code: string;
  title: string;
  author: string;
  color: string;
  /** Uploaded cover photo URL — replaces the generated design. */
  imageUrl?: string | null;
  className?: string;
  /** Lazy-load the photo (grids) or not (book page). */
  priority?: boolean;
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Darken / lighten a #rrggbb colour by amount (-1..1). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r} ${g} ${b})`;
}

/**
 * A generated book cover: shelf colour + one of four geometric motifs chosen from the
 * book code, serif title and author. Scales with its container (cqw units).
 */
export function BookCover({ code, title, author, color, imageUrl, className, priority }: Props) {
  const frame = cn(
    "@container relative aspect-[2/3] w-full overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(29,36,51,.18),0_6px_16px_-6px_rgba(29,36,51,.35)]",
    className,
  );

  if (imageUrl) {
    return (
      <div className={cn(frame, "bg-muted")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our checked upload route */}
        <img src={imageUrl} alt="" loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover" />
      </div>
    );
  }

  const h = hash(code);
  const motif = h % 4;
  const dark = shade(color, -0.35);
  const light = shade(color, 0.55);
  const longestWord = Math.max(...title.split(/\s+/).map((w) => w.length));
  const size = longestWord > 14 ? "text-[7.6cqw]" : longestWord > 11 || title.length > 34 ? "text-[9.5cqw]" : "text-[11.5cqw]";

  return (
    <div className={frame} style={{ background: color }} aria-hidden="true">
      {/* motif */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 300" preserveAspectRatio="none">
        {motif === 0 && (
          <>
            <rect x="0" y="196" width="200" height="10" fill={light} opacity=".35" />
            <rect x="0" y="212" width="200" height="3" fill={light} opacity=".35" />
            <rect x="0" y="221" width="200" height="79" fill={dark} opacity=".45" />
          </>
        )}
        {motif === 1 && (
          <>
            <circle cx="160" cy="250" r="110" fill={dark} opacity=".4" />
            <circle cx="160" cy="250" r="72" fill="none" stroke={light} strokeWidth="2" opacity=".4" />
          </>
        )}
        {motif === 2 &&
          Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={-40 + i * 34} y1="300" x2={60 + i * 34} y2="160" stroke={light} strokeWidth="1.5" opacity=".3" />
          ))}
        {motif === 3 && (
          <>
            <rect x="18" y="18" width="164" height="264" fill="none" stroke={light} strokeWidth="1.5" opacity=".55" />
            <rect x="24" y="24" width="152" height="252" fill="none" stroke={light} strokeWidth=".75" opacity=".4" />
          </>
        )}
        {/* spine shading */}
        <rect x="0" y="0" width="7" height="300" fill="#000" opacity=".18" />
        <rect x="7" y="0" width="1.5" height="300" fill="#fff" opacity=".12" />
      </svg>

      <div className="relative flex h-full flex-col px-[11cqw] pt-[13cqw] pb-[9cqw] text-[#fdf8ee]">
        <span className="font-sans text-[5.2cqw] font-medium tracking-[0.18em] uppercase opacity-75">{code}</span>
        <span className="mt-[3cqw] block h-px w-[18cqw] bg-current opacity-60" />
        <h3
          className={cn("mt-[6cqw] font-serif leading-[1.18] font-semibold text-balance break-words", size)}
          style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {title}
        </h3>
        <p className="mt-auto font-sans text-[6cqw] leading-snug opacity-90">{author}</p>
      </div>
    </div>
  );
}
