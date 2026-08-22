"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultDeniedOptionalConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  readConsentDecision,
  writeConsentDecision,
  type ConsentDecision,
  type ConsentPreferences,
} from "@/lib/consent/consent";

type ConsentContextValue = {
  decision: ConsentDecision;
  ready: boolean;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  save: (input: { analytics: boolean; marketing: boolean }) => void;
  acceptEssentialOnly: () => void;
  analyticsAllowed: boolean;
  marketingAllowed: boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [decision, setDecision] = useState<ConsentDecision>(null);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setDecision(readConsentDecision(window.localStorage));
      setReady(true);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const persist = useCallback((next: ConsentPreferences) => {
    writeConsentDecision(window.localStorage, next);
    setDecision(next);
    setSettingsOpen(false);
  }, []);

  const save = useCallback(
    (input: { analytics: boolean; marketing: boolean }) => {
      persist({
        ...defaultDeniedOptionalConsent(),
        analytics: input.analytics,
        marketing: input.marketing,
      });
    },
    [persist],
  );

  const acceptEssentialOnly = useCallback(() => {
    persist(defaultDeniedOptionalConsent());
  }, [persist]);

  const value = useMemo<ConsentContextValue>(
    () => ({
      decision,
      ready,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      save,
      acceptEssentialOnly,
      analyticsAllowed: hasAnalyticsConsent(decision),
      marketingAllowed: hasMarketingConsent(decision),
    }),
    [acceptEssentialOnly, decision, ready, save, settingsOpen],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return value;
}
