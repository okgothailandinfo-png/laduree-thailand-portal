/**
 * In-memory rate-limit foundation for pickup verification attempts.
 * Replace with Redis / edge middleware in production.
 *
 * Integration point: call `assertPickupVerifyRateLimit(key)` at the start of
 * verify handlers. Key should be a coarse identifier (e.g. admin session id
 * or boutique id) — never a raw token or pickup code.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 30;

export type RateLimitOptions = {
  windowMs?: number;
  maxAttempts?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function checkPickupVerifyRateLimit(
  key: string,
  options?: RateLimitOptions,
): RateLimitResult {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterMs: 0,
    };
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    retryAfterMs: 0,
  };
}

/** Test helper — clears in-memory buckets. */
export function resetPickupVerifyRateLimitForTests(): void {
  buckets.clear();
}
