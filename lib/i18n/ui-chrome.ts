import type { Locale } from "./locale";

/**
 * UI chrome strings only (language control, skip link, system status).
 * Product, legal, and marketing copy stay out of this map until owner-approved.
 */

export type UiChromeKey =
  | "skipToContent"
  | "languageSwitcherLabel"
  | "languageOptionEn"
  | "languageOptionTh"
  | "languageThPending"
  | "navPendingTitle"
  | "cartViewLabel"
  | "cartCloseLabel"
  | "notFoundTitle"
  | "notFoundBody"
  | "notFoundHome"
  | "errorTitle"
  | "errorBody"
  | "errorRetry";

const EN: Record<UiChromeKey, string> = {
  skipToContent: "Skip to content",
  languageSwitcherLabel: "Language",
  languageOptionEn: "EN",
  languageOptionTh: "TH",
  languageThPending: "[CONTENT PENDING APPROVAL]",
  navPendingTitle: "[CONTENT PENDING APPROVAL]",
  cartViewLabel: "View Cart",
  cartCloseLabel: "Close cart",
  notFoundTitle: "Page not found",
  notFoundBody: "The page you requested is not available.",
  notFoundHome: "Home",
  errorTitle: "Something went wrong",
  errorBody: "Please try again.",
  errorRetry: "Retry",
};

/**
 * Thai UI chrome — keys reserved; values remain pending until owner approval.
 * Never invent Thai translations here.
 */
const TH_PENDING: Record<UiChromeKey, string> = {
  skipToContent: "[CONTENT PENDING APPROVAL]",
  languageSwitcherLabel: "[CONTENT PENDING APPROVAL]",
  languageOptionEn: "EN",
  languageOptionTh: "TH",
  languageThPending: "[CONTENT PENDING APPROVAL]",
  navPendingTitle: "[CONTENT PENDING APPROVAL]",
  cartViewLabel: "[CONTENT PENDING APPROVAL]",
  cartCloseLabel: "[CONTENT PENDING APPROVAL]",
  notFoundTitle: "[CONTENT PENDING APPROVAL]",
  notFoundBody: "[CONTENT PENDING APPROVAL]",
  notFoundHome: "[CONTENT PENDING APPROVAL]",
  errorTitle: "[CONTENT PENDING APPROVAL]",
  errorBody: "[CONTENT PENDING APPROVAL]",
  errorRetry: "[CONTENT PENDING APPROVAL]",
};

const MESSAGES: Record<Locale, Record<UiChromeKey, string>> = {
  en: EN,
  th: TH_PENDING,
};

export function uiChrome(
  key: UiChromeKey,
  locale: Locale = "en",
): string {
  return MESSAGES[locale][key];
}
