/**
 * Locale architecture scaffold (Sprint 33A).
 *
 * Runtime storefront remains English until owner approves EN+TH launch and
 * supplies Thai UI/product/legal translations. Do not invent Thai copy.
 */

export const SUPPORTED_LOCALES = ["en", "th"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Locales enabled for customer selection in the storefront chrome. */
export const ACTIVE_STOREFRONT_LOCALES: readonly Locale[] = ["en"] as const;

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isStorefrontLocaleActive(locale: Locale): boolean {
  return ACTIVE_STOREFRONT_LOCALES.includes(locale);
}

/** BCP 47 / HTML lang mapping. */
export function htmlLangForLocale(locale: Locale): string {
  return locale === "th" ? "th" : "en";
}
