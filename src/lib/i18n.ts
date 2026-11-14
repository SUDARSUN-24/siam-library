import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, dictionaries, locales, type Locale } from "./dict";

export const LOCALE_COOKIE = "lang";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}

/** Current language from the `lang` cookie (default Thai). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
