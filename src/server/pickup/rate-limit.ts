/**
 * @deprecated Prefer `@/src/server/http/rate-limit`.
 * Kept as a thin wrapper for existing pickup verification call sites.
 */

import {
  assertRateLimit,
  resetMemoryRateLimitForTests,
  type RateLimitOptions as SharedOptions,
  type RateLimitResult,
} from "@/src/server/http/rate-limit";

export type RateLimitOptions = {
  windowMs?: number;
  maxAttempts?: number;
};

export type { RateLimitResult };

export async function checkPickupVerifyRateLimit(
  key: string,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    return await assertRateLimit({
      bucket: "pickup-verify",
      subject: key,
      windowMs: options?.windowMs,
      maxAttempts: options?.maxAttempts ?? 30,
    } satisfies SharedOptions);
  } catch {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: 60_000,
    };
  }
}

/** Test helper — clears in-memory buckets. */
export function resetPickupVerifyRateLimitForTests(): void {
  resetMemoryRateLimitForTests();
}
