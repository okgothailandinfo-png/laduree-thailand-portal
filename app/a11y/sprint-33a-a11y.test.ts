import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  FOCUSABLE_SELECTOR,
  getFocusableElements,
  trapTabKey,
} from "../../lib/a11y/dialog-focus";
import {
  ACTIVE_STOREFRONT_LOCALES,
  DEFAULT_LOCALE,
  htmlLangForLocale,
  isLocale,
  isStorefrontLocaleActive,
} from "../../lib/i18n/locale";
import { uiChrome } from "../../lib/i18n/ui-chrome";

describe("Sprint 33A — dialog focus helpers", () => {
  it("exposes a stable focusable selector", () => {
    assert.match(FOCUSABLE_SELECTOR, /button:not\(\[disabled\]\)/);
    assert.match(FOCUSABLE_SELECTOR, /\[href\]/);
  });

  it("trapTabKey ignores non-Tab keys", () => {
    const root = { querySelectorAll: () => [] } as unknown as HTMLElement;
    const event = {
      key: "Escape",
      preventDefault() {
        throw new Error("should not prevent");
      },
    } as unknown as KeyboardEvent;
    assert.equal(trapTabKey(event, root), false);
  });

  it("getFocusableElements filters aria-hidden nodes", () => {
    const hidden = {
      hasAttribute: () => false,
      getAttribute: (name: string) => (name === "aria-hidden" ? "true" : null),
    };
    const visible = {
      hasAttribute: () => false,
      getAttribute: () => null,
    };
    const root = {
      querySelectorAll: () => [hidden, visible],
    } as unknown as HTMLElement;
    assert.equal(getFocusableElements(root).length, 1);
  });
});

describe("Sprint 33A — cart drawer a11y contracts", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/cart/CartDrawer.tsx"),
    "utf8",
  );

  it("uses Escape, focus trap, inert, labelled title, and focus restore", () => {
    assert.match(source, /Escape/);
    assert.match(source, /trapTabKey/);
    assert.match(source, /inert:\s*true/);
    assert.match(source, /aria-labelledby=\{titleId\}/);
    assert.match(source, /previouslyFocusedRef/);
    assert.match(source, /closeRef\.current\?\.focus/);
  });
});

describe("Sprint 33A — layout / skip link / system pages", () => {
  it("root layout mounts SkipToContent and keeps lang=en", () => {
    const layout = readFileSync(
      path.join(process.cwd(), "app/layout.tsx"),
      "utf8",
    );
    assert.match(layout, /SkipToContent/);
    assert.match(layout, /lang=\"en\"/);
  });

  it("globals define focus-visible, skip-link, reduced-motion, brand canvas tokens", () => {
    const css = readFileSync(
      path.join(process.cwd(), "app/globals.css"),
      "utf8",
    );
    assert.match(css, /:focus-visible/);
    assert.match(css, /\.skip-to-content/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /--brand-page-canvas/);
    assert.match(css, /--brand-page-canvas-white/);
    assert.match(css, /OWNER \/ BRAND CONFIRMATION REQUIRED/);
    assert.match(css, /overflow-x:\s*hidden/);
  });

  it("provides not-found and error system pages targeting #main-content", () => {
    const notFound = readFileSync(
      path.join(process.cwd(), "app/not-found.tsx"),
      "utf8",
    );
    const errorPage = readFileSync(
      path.join(process.cwd(), "app/error.tsx"),
      "utf8",
    );
    assert.match(notFound, /id=\"main-content\"/);
    assert.match(errorPage, /id=\"main-content\"/);
    assert.match(notFound, /uiChrome\(\"notFoundHome\"\)/);
  });
});

describe("Sprint 33A — storefront landmarks and image alts", () => {
  it("homepage main landmark and product image alts use product titles", () => {
    const page = readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    assert.match(page, /id=\"main-content\"/);
    assert.match(page, /alt=\{product\.title\}/);
    assert.match(page, /LanguageSwitcher/);
    assert.match(page, /PendingNavControl/);
    assert.match(page, /prefers-reduced-motion/);
  });

  it("PDP uses meaningful image alt text", () => {
    const pdp = readFileSync(
      path.join(process.cwd(), "app/product/[slug]/ProductDetailClient.tsx"),
      "utf8",
    );
    assert.match(pdp, /alt=\{/);
    assert.match(pdp, /product\.title/);
    assert.match(pdp, /id=\"main-content\"/);
  });
});

describe("Sprint 33A — EN/TH architecture readiness", () => {
  it("keeps EN as the only active storefront locale", () => {
    assert.equal(DEFAULT_LOCALE, "en");
    assert.deepEqual([...ACTIVE_STOREFRONT_LOCALES], ["en"]);
    assert.equal(isStorefrontLocaleActive("en"), true);
    assert.equal(isStorefrontLocaleActive("th"), false);
    assert.equal(isLocale("th"), true);
    assert.equal(htmlLangForLocale("en"), "en");
    assert.equal(htmlLangForLocale("th"), "th");
  });

  it("does not invent Thai chrome copy", () => {
    assert.equal(uiChrome("skipToContent", "en"), "Skip to content");
    assert.equal(uiChrome("languageThPending", "th"), "[CONTENT PENDING APPROVAL]");
    assert.equal(uiChrome("notFoundTitle", "th"), "[CONTENT PENDING APPROVAL]");
  });

  it("LanguageSwitcher disables TH until activated", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/a11y/LanguageSwitcher.tsx"),
      "utf8",
    );
    assert.match(source, /disabled=\{!thActive\}/);
    assert.match(source, /languageThPending/);
  });
});
