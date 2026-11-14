"use client";

import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Native <select> (best on phones) that submits its form when changed. */
export function AutoSubmitSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative inline-flex">
      <select
        {...props}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={cn(
          "h-10 w-full appearance-none rounded-full border border-input bg-card pr-9 pl-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}
