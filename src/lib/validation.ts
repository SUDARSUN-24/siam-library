import { z } from "zod";
import { fmt, type Dict } from "./dict";

/** Book code: shelf letters + dash + 3 digits, e.g. "A-001". */
export const bookCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,3}-\d{3}$/, "Use a code like A-001");

export const shelfCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,3}$/);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Home page filters from the URL (?q=&shelf=&category=&status=). Bad values are dropped, never thrown. */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  shelf: shelfCodeSchema.optional().catch(undefined),
  category: z.string().trim().max(60).optional().catch(undefined),
  status: z.enum(["AVAILABLE", "BORROWED"]).optional().catch(undefined),
});
export type SearchFilters = z.infer<typeof searchParamsSchema>;

/** Staff login form. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

/** ISBN-10 or ISBN-13, hyphens/spaces allowed. */
const isbnSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
  .refine((v) => v === "" || /^(\d{9}[\dX]|\d{13})$/.test(v), "ISBN must be 10 or 13 digits")
  .transform((v) => (v ? v : undefined));

/** Add / edit book form (staff). */
export const bookFormSchema = z.object({
  code: bookCodeSchema,
  title: z.string().trim().min(1).max(200),
  altTitle: optionalText(200),
  author: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(60),
  language: z.enum(["th", "en"]),
  year: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1000).max(2100).optional()),
  publisher: optionalText(200),
  isbn: isbnSchema.optional(),
  shelfId: z.string().trim().min(1).max(40),
  row: z.coerce.number().int().min(1).max(50),
});
export type BookFormInput = z.infer<typeof bookFormSchema>;

/**
 * Turn book-form zod issues into messages in the UI language (one per field).
 * zod's own messages are English-only, so we map by field and issue type instead.
 */
export function bookFormErrors(
  issues: z.core.$ZodIssue[],
  values: Record<string, string>,
  t: Dict,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    // An empty required field is always "required", whatever rule it failed.
    errors[field] ??= values[field]?.trim() ? bookIssueMessage(field, issue, t) : t.errRequired;
  }
  return errors;
}

function bookIssueMessage(field: string, issue: z.core.$ZodIssue, t: Dict): string {
  switch (field) {
    case "code":
      return t.errCodeFormat;
    case "isbn":
      return t.errIsbn;
    case "year":
      return t.errYear;
    case "row":
      return t.errRow;
    case "language":
    case "shelfId":
      return t.errChoice;
  }
  if (issue.code === "too_big") return fmt(t.errTooLong, { max: Number(issue.maximum) });
  return t.errInvalid;
}

/** Reorder preview pages: full list of page ids in the new order. */
export const reorderSchema = z.object({
  bookId: z.string().min(1).max(40),
  pageIds: z.array(z.string().min(1).max(40)).max(50),
});

/** Uploaded file names are always <uuid>.webp — anything else is rejected. */
export const uploadFileNameSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/);
