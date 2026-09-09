export const LOCALES = [
  { code: "en", label: "English", flag: "🇺🇸", intl: "en-US" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", intl: "de-DE" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳", intl: "hi-IN" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lifeos-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

export function intlTag(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)!.intl;
}
