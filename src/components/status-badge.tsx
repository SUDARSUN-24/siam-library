import { cn } from "@/lib/utils";
import { fmt, formatDate, type Dict, type Locale } from "@/lib/dict";

type Props = {
  status: "AVAILABLE" | "BORROWED";
  dueDate?: Date | string | null;
  t: Dict;
  locale: Locale;
  size?: "sm" | "lg";
  className?: string;
};

export function StatusBadge({ status, dueDate, t, locale, size = "sm", className }: Props) {
  const available = status === "AVAILABLE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        available ? "bg-available/10 text-available" : "bg-borrowed/10 text-borrowed",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", available ? "bg-available" : "bg-borrowed")} aria-hidden="true" />
      {available ? t.statusAvailable : t.statusBorrowed}
      {!available && dueDate && size === "lg" && (
        <span className="font-normal opacity-90">· {fmt(t.dueBack, { date: formatDate(dueDate, locale) })}</span>
      )}
    </span>
  );
}
