import type { Metadata } from "next";
import Link from "next/link";
import { uiChrome } from "@/lib/i18n/ui-chrome";

export const metadata: Metadata = {
  title: "Page not found | Ladurée Thailand",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main-content" className="system-page" tabIndex={-1}>
      <h1 className="system-page__title">{uiChrome("notFoundTitle")}</h1>
      <p className="system-page__body">{uiChrome("notFoundBody")}</p>
      <Link href="/" className="btn-primary system-page__cta">
        {uiChrome("notFoundHome")}
      </Link>
    </main>
  );
}
