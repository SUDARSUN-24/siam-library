"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveBook, type BookFormState } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryLabel, type Dict, type Locale } from "@/lib/dict";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

type Shelf = { id: string; code: string; nameEn: string; nameTh: string };
type BookValues = {
  id?: string;
  code: string;
  title: string;
  altTitle?: string | null;
  author: string;
  category: string;
  language: string;
  year?: number | null;
  publisher?: string | null;
  isbn?: string | null;
  shelfId: string;
  row: number;
};

type Props = {
  t: Dict;
  locale: Locale;
  shelves: Shelf[];
  categories: string[];
  /** next free code per shelf id, e.g. { abc: "A-007" } — used when adding */
  nextCodes: Record<string, string>;
  book?: BookValues;
};

export function BookForm({ t, locale, shelves, categories, nextCodes, book }: Props) {
  const [state, action] = useActionState<BookFormState, FormData>(saveBook, {});
  const v = (key: keyof BookValues) => state.values?.[key] ?? (book?.[key] != null ? String(book[key]) : "");
  const err = (key: string) => state.errors?.[key];

  const initialShelf = v("shelfId") || shelves[0]?.id || "";
  const [shelfId, setShelfId] = useState(initialShelf);
  const [code, setCode] = useState(v("code") || (book ? "" : (nextCodes[initialShelf] ?? "")));
  const autoCode = useRef(!book); // only auto-fill codes for new books until staff edit the code

  useEffect(() => {
    if (state.ok) toast.success(t.adminSaved);
  }, [state, t.adminSaved]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" data-testid="book-form">
      {book?.id && <input type="hidden" name="bookId" value={book.id} />}

      <Field label={t.fieldShelf} error={err("shelfId")} htmlFor="shelfId">
        <select
          id="shelfId"
          name="shelfId"
          value={shelfId}
          onChange={(e) => {
            setShelfId(e.target.value);
            if (autoCode.current) setCode(nextCodes[e.target.value] ?? "");
          }}
          className={selectCls}
        >
          {shelves.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {locale === "th" ? s.nameTh : s.nameEn}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t.fieldCode} hint={t.fieldCodeHint} error={err("code")} htmlFor="code">
        <Input
          id="code"
          name="code"
          required
          value={code}
          onChange={(e) => {
            autoCode.current = false;
            setCode(e.target.value.toUpperCase());
          }}
          pattern="[A-Za-z]{1,3}-[0-9]{3}"
          maxLength={7}
          className={cn(inputCls, "font-mono uppercase")}
        />
      </Field>

      <Field label={t.fieldTitle} error={err("title")} htmlFor="title" wide>
        <Input id="title" name="title" required maxLength={200} defaultValue={v("title")} className={inputCls} />
      </Field>
      <Field label={t.fieldAltTitle} optional={t.optional} error={err("altTitle")} htmlFor="altTitle" wide>
        <Input id="altTitle" name="altTitle" maxLength={200} defaultValue={v("altTitle")} className={inputCls} />
      </Field>
      <Field label={t.fieldAuthor} error={err("author")} htmlFor="author" wide>
        <Input id="author" name="author" required maxLength={200} defaultValue={v("author")} className={inputCls} />
      </Field>

      <Field label={t.fieldCategory} error={err("category")} htmlFor="category">
        <Input id="category" name="category" required maxLength={60} list="categories" defaultValue={v("category")} className={inputCls} />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c, locale)}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label={t.fieldLanguage} error={err("language")} htmlFor="language">
        <select id="language" name="language" defaultValue={v("language") || "th"} className={selectCls}>
          <option value="th">{t.langTh}</option>
          <option value="en">{t.langEn}</option>
        </select>
      </Field>

      <Field label={t.fieldRow} error={err("row")} htmlFor="row">
        <Input id="row" name="row" type="number" inputMode="numeric" min={1} max={50} required defaultValue={v("row") || "1"} className={inputCls} />
      </Field>
      <Field label={t.fieldYear} optional={t.optional} error={err("year")} htmlFor="year">
        <Input id="year" name="year" type="number" inputMode="numeric" min={1000} max={2100} defaultValue={v("year")} className={inputCls} />
      </Field>
      <Field label={t.fieldPublisher} optional={t.optional} error={err("publisher")} htmlFor="publisher">
        <Input id="publisher" name="publisher" maxLength={200} defaultValue={v("publisher")} className={inputCls} />
      </Field>
      <Field label={t.fieldIsbn} optional={t.optional} error={err("isbn")} htmlFor="isbn">
        <Input id="isbn" name="isbn" inputMode="numeric" maxLength={20} defaultValue={v("isbn")} className={inputCls} />
      </Field>

      <div className="flex justify-end gap-2 sm:col-span-2">
        <SubmitButton className="h-11 min-w-32 text-base" pendingLabel={t.adminSaving} data-testid="save-book">
          {t.adminSave}
        </SubmitButton>
      </div>
    </form>
  );
}

const inputCls = "h-11 bg-card text-base sm:text-sm";
const selectCls =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 sm:text-sm";

function Field({
  label,
  hint,
  optional,
  error,
  htmlFor,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  optional?: string;
  error?: string;
  htmlFor: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">({optional})</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
