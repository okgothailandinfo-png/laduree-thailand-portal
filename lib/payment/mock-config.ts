/**
 * Fixed development configuration for mock payment UX.
 * Not production expiry rules — display / local simulation only.
 */

/** Mock PromptPay / authorization window length (15 minutes). */
export const MOCK_PAYMENT_EXPIRY_MS = 15 * 60 * 1000;

export function mockPaymentExpiresAt(createdAtIso: string): string {
  const created = Date.parse(createdAtIso);
  const base = Number.isFinite(created) ? created : Date.now();
  return new Date(base + MOCK_PAYMENT_EXPIRY_MS).toISOString();
}

export function mockPaymentRemainingMs(
  createdAtIso: string,
  nowMs: number = Date.now(),
): number {
  const expires = Date.parse(mockPaymentExpiresAt(createdAtIso));
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, expires - nowMs);
}

export function formatMockCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
