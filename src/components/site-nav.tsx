"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LibraryBig } from "lucide-react";
import { cn } from "@/lib/utils";

/** Header links with the current section marked (crimson text + underline, aria-current). */
export function SiteNav({ booksLabel, shelvesLabel }: { booksLabel: string; shelvesLabel: string }) {
  const path = usePathname();
  const booksActive = path === "/books" || path.startsWith("/book/") || path.startsWith("/category/");
  const shelvesActive = path.startsWith("/shelf/");
  const item = (active: boolean) =>
    cn(
      "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium sm:px-3",
      "after:absolute after:inset-x-2.5 after:-bottom-[9px] after:h-[3px] after:rounded-full sm:after:inset-x-3 sm:after:-bottom-[13px]",
      active ? "text-primary after:bg-primary" : "text-foreground/75 hover:text-primary",
    );
  return (
    <>
      <Link href="/books" data-testid="nav-books" aria-current={booksActive ? "page" : undefined} className={item(booksActive)}>
        <LibraryBig className="size-4 sm:hidden" aria-hidden="true" />
        {booksLabel}
      </Link>
      <Link href="/#shelves" aria-current={shelvesActive ? "page" : undefined} className={cn(item(shelvesActive), "hidden sm:inline-flex")}>
        {shelvesLabel}
      </Link>
    </>
  );
}
