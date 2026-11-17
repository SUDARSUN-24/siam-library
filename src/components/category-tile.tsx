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

export function CategoryTile({ name, count, t, locale }: { name: string; count: number; t: Dict; locale: Locale }) {
  const Icon = icons[name] ?? BookMarked;
  const label = categoryLabel(name, locale);
  const other = categoryLabel(name, locale === "th" ? "en" : "th");
  return (
    <Link
      href={categoryPath(name)}
      data-testid="category-tile"
      className="group surface flex h-full items-center gap-3 rounded-xl p-3 transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-(--shadow-lift)"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
