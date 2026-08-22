import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONSENT_VERSION,
  defaultDeniedOptionalConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  isOptionalIntegrationAllowed,
  parseConsentDecision,
} from "./consent";

describe("Sprint 33D — consent preferences", () => {
  it("defaults optional analytics and marketing to denied", () => {
    const decision = defaultDeniedOptionalConsent(new Date("2026-08-22T00:00:00.000Z"));
    assert.equal(decision.version, CONSENT_VERSION);
    assert.equal(decision.essential, true);
    assert.equal(decision.analytics, false);
    assert.equal(decision.marketing, false);
    assert.equal(hasAnalyticsConsent(decision), false);
    assert.equal(hasMarketingConsent(decision), false);
  });

  it("rejects malformed stored consent", () => {
    assert.equal(parseConsentDecision(null), null);
    assert.equal(parseConsentDecision({ version: 1, essential: true }), null);
    assert.equal(
      parseConsentDecision({
        version: 1,
        essential: false,
        analytics: true,
        marketing: false,
        updatedAt: "2026-08-22T00:00:00.000Z",
      }),
      null,
    );
  });

  it("gates optional integrations behind saved consent", () => {
    const allowed = parseConsentDecision({
      version: 1,
      essential: true,
      analytics: true,
      marketing: false,
      updatedAt: "2026-08-22T00:00:00.000Z",
    });
    assert.equal(isOptionalIntegrationAllowed("analytics", allowed), true);
    assert.equal(isOptionalIntegrationAllowed("marketing", allowed), false);
    assert.equal(isOptionalIntegrationAllowed("analytics", null), false);
  });
});
