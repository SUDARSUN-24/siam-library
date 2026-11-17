import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  ChartLine,
  Code,
  Database,
  Feather,
  Library,
  Megaphone,
  Network,
  Rocket,
  ScrollText,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { categoryPath } from "@/lib/catalogue";
import { categoryLabel, fmt, type Dict, type Locale } from "@/lib/dict";

const icons: Record<string, LucideIcon> = {
  Programming: Code,
  Networking: Network,
  "Software Engineering": Workflow,
  "Artificial Intelligence": Brain,
  Database: Database,
  Security: Shield,
  Management: Briefcase,
  Accounting: Calculator,
  Entrepreneurship: Rocket,
  Marketing: Megaphone,
  "Business Analytics": ChartLine,
  Novel: BookOpen,
  Poetry: Feather,
  "Short Stories": ScrollText,
  "Literary Studies": Library,
};

/** Bright tones: icon colour on its own soft tint (and the solid hue for accents). */
export const tones = [
  { soft: "bg-sky-soft", text: "text-hue-blue", solid: "bg-hue-blue" },
  { soft: "bg-rose-soft", text: "text-hue-raspberry", solid: "bg-hue-raspberry" },
  { soft: "bg-mint-soft", text: "text-hue-teal", solid: "bg-hue-teal" },
  { soft: "bg-sun-soft", text: "text-hue-orange", solid: "bg-hue-orange" },
  { soft: "bg-lilac-soft", text: "text-hue-violet", solid: "bg-hue-violet" },
] as const;

const known = Object.keys(icons);

/** Fixed icon + colour per category, the same on every page (home tiles, filters, category page). */
export function categoryStyle(name: string) {
  const i = known.indexOf(name);
  const n = i >= 0 ? i : [...name].reduce((h, c) => h + c.charCodeAt(0), 0);
  return { Icon: icons[name] ?? BookMarked, tone: tones[n % tones.length] };
}

export function CategoryTile({ name, count, t, locale }: { name: string; count: number; t: Dict; locale: Locale }) {
  const { Icon, tone } = categoryStyle(name);
  const label = categoryLabel(name, locale);
  const other = categoryLabel(name, locale === "th" ? "en" : "th");
  return (
    <Link
      href={categoryPath(name)}
      data-testid="category-tile"
      className="group surface flex h-full items-center gap-3 rounded-xl p-3 transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-(--shadow-lift)"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${tone.soft} ${tone.text}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{label}</span>
        {other !== label && <span className="truncate text-xs text-muted-foreground">{other}</span>}
        <span className="text-xs text-muted-foreground tabular-nums">
          {count === 1 ? t.bookCount1 : fmt(t.booksCount, { n: count.toLocaleString("en-US") })}
        </span>
      </span>
    </Link>
  );
}
