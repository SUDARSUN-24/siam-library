"use client";

import { useState } from "react";
import { Dialog as D } from "radix-ui";
import { SlidersHorizontal, X } from "lucide-react";

type Props = {
  label: string;
  closeLabel: string;
  showLabel: string;
  activeCount: number;
  /** The server-rendered FilterPanel. */
  children: React.ReactNode;
};

/** Phones/tablets: the filter sidebar opens as a bottom sheet. Choosing a filter (a link) closes it. */
export function FilterSheet({ label, closeLabel, showLabel, activeCount, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        <button
          type="button"
          data-testid="filters-button"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium shadow-sm hover:border-primary hover:text-primary lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {label}
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[#1d2433]/35 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <D.Content
          data-testid="filter-sheet"
          aria-describedby={undefined}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t-[3px] border-primary bg-card shadow-[0_-12px_32px_-12px_rgba(29,36,51,.35)] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
          <div className="flex items-center justify-between px-4 pt-2 pb-3">
            <D.Title className="font-serif text-lg font-semibold">{label}</D.Title>
            <D.Close className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label={closeLabel}>
              <X className="size-5" aria-hidden="true" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">{children}</div>
          <div className="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <D.Close className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
              {showLabel}
            </D.Close>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
