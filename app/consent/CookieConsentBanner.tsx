"use client";

import { useEffect, useId, useRef } from "react";
import { trapTabKey } from "@/lib/a11y/dialog-focus";
import { uiChrome } from "@/lib/i18n/ui-chrome";
import { useConsent } from "./ConsentContext";
import "./consent.css";

export default function CookieConsentBanner() {
  const {
    ready,
    decision,
    settingsOpen,
    openSettings,
    closeSettings,
    save,
    acceptEssentialOnly,
  } = useConsent();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const showBanner = ready && decision === null && !settingsOpen;

  useEffect(() => {
    if (!settingsOpen) return;
    const root = dialogRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const first = root?.querySelector<HTMLElement>("button, input");
    first?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (decision) closeSettings();
        return;
      }
      if (root) trapTabKey(event, root);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [closeSettings, decision, settingsOpen]);

  if (!ready) return null;
  if (!showBanner && !settingsOpen) return null;

  return (
    <div className="cookie-consent">
      {showBanner ? (
        <div
          className="cookie-consent__banner"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <h2 id={titleId} className="cookie-consent__title">
            {uiChrome("cookieSettings")}
          </h2>
          <p className="cookie-consent__body">{uiChrome("cookieBannerBody")}</p>
          <div className="cookie-consent__actions">
            <button
              type="button"
              className="cookie-consent__button"
              onClick={acceptEssentialOnly}
            >
              {uiChrome("cookieEssentialOnly")}
            </button>
            <button
              type="button"
              className="cookie-consent__button cookie-consent__button--primary"
              onClick={openSettings}
            >
              {uiChrome("cookieSettings")}
            </button>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="cookie-consent__backdrop">
          <div
            ref={dialogRef}
            className="cookie-consent__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-panel`}
          >
            <ConsentSettingsForm
              titleId={`${titleId}-panel`}
              analyticsDefault={decision?.analytics === true}
              marketingDefault={decision?.marketing === true}
              onSave={save}
              onEssentialOnly={acceptEssentialOnly}
              onClose={decision ? closeSettings : undefined}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConsentSettingsForm({
  titleId,
  analyticsDefault,
  marketingDefault,
  onSave,
  onEssentialOnly,
  onClose,
}: {
  titleId: string;
  analyticsDefault: boolean;
  marketingDefault: boolean;
  onSave: (input: { analytics: boolean; marketing: boolean }) => void;
  onEssentialOnly: () => void;
  onClose?: () => void;
}) {
  return (
    <form
      className="cookie-consent__form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const analytics =
          form.analytics instanceof HTMLInputElement
            ? form.analytics.checked
            : false;
        const marketing =
          form.marketing instanceof HTMLInputElement
            ? form.marketing.checked
            : false;
        onSave({ analytics, marketing });
      }}
    >
      <h2 id={titleId} className="cookie-consent__title">
        {uiChrome("cookieSettings")}
      </h2>
      <p className="cookie-consent__body">{uiChrome("cookieBannerBody")}</p>
      <fieldset className="cookie-consent__fieldset">
        <label className="cookie-consent__option">
          <input type="checkbox" checked disabled readOnly />
          {uiChrome("cookieEssential")}
        </label>
        <label className="cookie-consent__option">
          <input
            type="checkbox"
            name="analytics"
            defaultChecked={analyticsDefault}
          />
          {uiChrome("cookieAnalytics")}
        </label>
        <label className="cookie-consent__option">
          <input
            type="checkbox"
            name="marketing"
            defaultChecked={marketingDefault}
          />
          {uiChrome("cookieMarketing")}
        </label>
      </fieldset>
      <div className="cookie-consent__actions">
        <button
          type="button"
          className="cookie-consent__button"
          onClick={onEssentialOnly}
        >
          {uiChrome("cookieEssentialOnly")}
        </button>
        <button
          type="submit"
          className="cookie-consent__button cookie-consent__button--primary"
        >
          {uiChrome("cookieSave")}
        </button>
        {onClose ? (
          <button
            type="button"
            className="cookie-consent__button"
            onClick={onClose}
          >
            {uiChrome("cookieClose")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
