import { createHash } from "node:crypto";
import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

export type RateLimitOptions = {
  /** Logical bucket name, e.g. "checkout", "admin-login". */
  bucket: string;
  /** Coarse subject already hashed or non-sensitive (ip hash, session placeholder). */
  subject: string;
  windowMs?: number;
  maxAttempts?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

export type RateLimitStore = {
  name: "memory" | "redis";
  check(key: string, windowMs: number, maxAttempts: number): Promise<RateLimitResult>;
};

class MemoryRateLimitStore implements RateLimitStore {
  readonly name = "memory" as const;

  async check(
    key: string,
    windowMs: number,
    maxAttempts: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = memoryBuckets.get(key);

    if (!existing || existing.resetAt <= now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
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
}

/**
 * Redis/Upstash-compatible store placeholder.
 * Production requires REDIS_URL; this sprint does not integrate a paid SaaS SDK.
 * When configured, fails closed until a real Redis client is wired.
 */
class RedisRateLimitStore implements RateLimitStore {
  readonly name = "redis" as const;

  constructor(private readonly redisUrl: string) {
    if (!redisUrl) {
      throw new AppError(
        "CONFIG_ERROR",
        "REDIS_URL is required for redis rate limiting.",
      );
    }
  }

  async check(
    key: string,
    windowMs: number,
    maxAttempts: number,
  ): Promise<RateLimitResult> {
    void key;
    void windowMs;
    void maxAttempts;
    // Production Blocker: wire ioredis/upstash client here.
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Redis rate-limit store is configured but not implemented. This is a Production Blocker.",
    );
  }
}

let store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (store) return store;

  if (env.rateLimitStore === "redis") {
    if (env.appEnv === "production" && !env.redisUrl) {
      throw new AppError(
        "CONFIG_ERROR",
        "REDIS_URL is required when RATE_LIMIT_STORE=redis in production.",
      );
    }
    store = new RedisRateLimitStore(env.redisUrl ?? "");
    return store;
  }

  if (env.appEnv === "production") {
    throw new AppError(
      "CONFIG_ERROR",
      "In-memory rate limiting is not allowed in production.",
    );
  }

  store = new MemoryRateLimitStore();
  return store;
}

/** Hash sensitive identifiers before using them as rate-limit keys. */
export function hashRateLimitSubject(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function assertRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowMs = options.windowMs ?? 60_000;
  const maxAttempts = options.maxAttempts ?? 30;
  const key = `${options.bucket}:${options.subject}`;
  const result = await getRateLimitStore().check(key, windowMs, maxAttempts);
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(result.retryAfterMs / 1000),
    );
    throw new AppError("RATE_LIMITED", "Too many requests. Try again later.", {
      retryAfterSeconds,
    });
  }
  return result;
}

/** Client IP coarse subject — never logs the raw value at call sites. */
export function clientSubjectFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return hashRateLimitSubject(ip);
}

/** Test helper */
export function resetMemoryRateLimitForTests(): void {
  memoryBuckets.clear();
  store = null;
}
