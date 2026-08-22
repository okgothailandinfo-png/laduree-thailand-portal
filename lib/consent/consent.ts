/**
 * Technical cookie-consent preferences.
 * Does not contain Thailand legal policy text.
 */

export const CONSENT_STORAGE_KEY = "laduree.consent.v1";
export const CONSENT_VERSION = 1 as const;

export type ConsentPreferences = {
  version: typeof CONSENT_VERSION;
  /** Always true — cart, session, and checkout cannot be disabled. */
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export type ConsentDecision = ConsentPreferences | null;

export function defaultDeniedOptionalConsent(
  now: Date = new Date(),
): ConsentPreferences {
  return {
    version: CONSENT_VERSION,
    essential: true,
    analytics: false,
    marketing: false,
    updatedAt: now.toISOString(),
  };
}

export function parseConsentDecision(raw: unknown): ConsentDecision {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.version !== CONSENT_VERSION) return null;
  if (value.essential !== true) return null;
  if (typeof value.analytics !== "boolean") return null;
  if (typeof value.marketing !== "boolean") return null;
  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) {
    return null;
  }
  return {
    version: CONSENT_VERSION,
    essential: true,
    analytics: value.analytics,
    marketing: value.marketing,
    updatedAt: value.updatedAt,
  };
}

export function readConsentDecision(
  storage: Pick<Storage, "getItem"> | null,
): ConsentDecision {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return parseConsentDecision(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeConsentDecision(
  storage: Pick<Storage, "setItem">,
  decision: ConsentPreferences,
): void {
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(decision));
}

export function hasAnalyticsConsent(decision: ConsentDecision): boolean {
  return decision?.analytics === true;
}

export function hasMarketingConsent(decision: ConsentDecision): boolean {
  return decision?.marketing === true;
}

/**
 * Optional third-party tags must call this before injecting scripts.
 * No analytics/marketing vendors are registered in this sprint.
 */
export function isOptionalIntegrationAllowed(
  kind: "analytics" | "marketing",
  decision: ConsentDecision,
): boolean {
  if (kind === "analytics") return hasAnalyticsConsent(decision);
  return hasMarketingConsent(decision);
}
