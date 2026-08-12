"use client";

import {
  DEFAULT_LOCALE,
  isStorefrontLocaleActive,
  type Locale,
} from "@/lib/i18n/locale";
import { uiChrome } from "@/lib/i18n/ui-chrome";

type LanguageSwitcherProps = {
  className?: string;
  /** Active locale — storefront remains EN until TH is approved and wired. */
  locale?: Locale;
};

/**
 * EN/TH control scaffold. TH is disabled until owner-approved translations and
 * locale routing exist. Does not invent Thai product or legal copy.
 */
export default function LanguageSwitcher({
  className = "",
  locale = DEFAULT_LOCALE,
}: LanguageSwitcherProps) {
  const thActive = isStorefrontLocaleActive("th");

  return (
    <div
      className={`language-switcher ${className}`.trim()}
      role="group"
      aria-label={uiChrome("languageSwitcherLabel", locale)}
    >
      <button
        type="button"
        className={`language-switcher__option${locale === "en" ? " is-active" : ""}`}
        aria-current={locale === "en" ? "true" : undefined}
        aria-pressed={locale === "en"}
        disabled={locale === "en"}
      >
        {uiChrome("languageOptionEn", locale)}
      </button>
      <span className="language-switcher__sep" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        className="language-switcher__option"
        disabled={!thActive}
        aria-disabled={!thActive}
        title={thActive ? undefined : uiChrome("languageThPending", locale)}
      >
        {uiChrome("languageOptionTh", locale)}
      </button>
    </div>
  );
}
