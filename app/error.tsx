"use client";

import { useEffect } from "react";
import { uiChrome } from "@/lib/i18n/ui-chrome";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="system-page" tabIndex={-1}>
      <h1 className="system-page__title">{uiChrome("errorTitle")}</h1>
      <p className="system-page__body" role="alert">
        {uiChrome("errorBody")}
      </p>
      <button type="button" className="btn-primary system-page__cta" onClick={reset}>
        {uiChrome("errorRetry")}
      </button>
    </main>
  );
}
