import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a TEXT preview page. Markup (kept tiny on purpose so staff can type it):
 *   "# "  title          "## " subtitle / chapter heading     "### " small label
 *   "> "  centred line   "toc: Title::page"  contents row with dotted leader
 *   blank line = new paragraph; single line breaks are kept (poetry).
 */
export function PageText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const isTitlePage = /^# /m.test(text);

  return (
    <div
      className={cn(
        "flex flex-col font-serif text-[clamp(14px,4.1cqw,18px)] leading-[1.85] text-[#2a2f3a]",
        isTitlePage && "h-full items-center justify-center text-center",
        className,
      )}
    >
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        // a block made only of special lines → render each line on its own
        if (lines.every((l) => /^(#{1,3} |> |toc: )/.test(l))) {
          return <Fragment key={bi}>{lines.map((l, li) => renderLine(l, `${bi}-${li}`, isTitlePage))}</Fragment>;
        }
        return (
          <p key={bi} className={cn("mb-[1em] whitespace-pre-line", !isTitlePage && "prose-justify")}>
            {block}
          </p>
        );
      })}
    </div>
  );
}

function renderLine(line: string, key: string, titlePage: boolean) {
  if (line.startsWith("### "))
    return (
      <p key={key} className="eyebrow mb-[1.4em] text-center font-sans !text-[0.72em] text-crimson">
        {line.slice(4)}
      </p>
    );
  if (line.startsWith("## "))
    return (
      <h4
        key={key}
        className={cn(
          "font-semibold text-balance",
          titlePage ? "mt-[0.6em] text-[1.05em] font-normal text-muted-foreground italic" : "mb-[1em] text-[1.18em] leading-snug",
        )}
      >
        {line.slice(3)}
      </h4>
    );
  if (line.startsWith("# "))
    return (
      <h3 key={key} className="text-[1.7em] leading-[1.25] font-semibold text-balance">
        {line.slice(2)}
      </h3>
    );
  if (line.startsWith("> "))
    return (
      <p key={key} className="mt-[1.2em] text-center font-sans text-[0.8em] text-muted-foreground">
        {line.slice(2)}
      </p>
    );
  // toc: Title::page
  const [title, page = ""] = line.slice(5).split("::");
  return (
    <div key={key} className="flex items-baseline gap-2 text-[0.92em] leading-[2]">
      <span className="min-w-0">{title}</span>
      <span className="mb-[0.3em] flex-1 border-b border-dotted border-current opacity-35" aria-hidden="true" />
      <span className="font-sans text-[0.85em] tabular-nums opacity-70">{page}</span>
    </div>
  );
}
