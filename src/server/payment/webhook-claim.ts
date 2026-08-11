/**
 * Sprint 32 — webhook claim durability helpers.
 * Stale PROCESSING claims may be reclaimed so a crashed worker cannot poison retries.
 */
export const WEBHOOK_CLAIM_STALE_MS = 5 * 60 * 1000;

export function isWebhookClaimStale(
  updatedAtIsoOrDate: string | Date,
  nowMs: number = Date.now(),
  staleMs: number = WEBHOOK_CLAIM_STALE_MS,
): boolean {
  const updatedAt =
    typeof updatedAtIsoOrDate === "string"
      ? Date.parse(updatedAtIsoOrDate)
      : updatedAtIsoOrDate.getTime();
  if (!Number.isFinite(updatedAt)) return true;
  return nowMs - updatedAt >= staleMs;
}

export function isPrismaUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
  );
}
