/**
 * Production Redis rate-limit store (provider-agnostic Redis URL).
 * Works with any Redis-compatible host (self-hosted, managed, Upstash Redis protocol).
 * Credentials stay server-side via REDIS_URL — never exposed to the client.
 */

import Redis from "ioredis";
import type { RateLimitResult, RateLimitStore } from "@/src/server/http/rate-limit";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";

const KEY_PREFIX = "rl:v1:";

export class RedisRateLimitStore implements RateLimitStore {
  readonly name = "redis" as const;
  private readonly client: Redis;

  constructor(redisUrl: string) {
    if (!redisUrl?.trim()) {
      throw new AppError(
        "CONFIG_ERROR",
        "REDIS_URL is required for redis rate limiting.",
      );
    }
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.client.on("error", (error) => {
      logger.error("Redis rate-limit client error", {
        message: error instanceof Error ? error.message : "unknown",
      });
    });
  }

  async check(
    key: string,
    windowMs: number,
    maxAttempts: number,
  ): Promise<RateLimitResult> {
    const redisKey = `${KEY_PREFIX}${key}`;
    try {
      if (this.client.status === "wait") {
        await this.client.connect();
      }

      const count = await this.client.incr(redisKey);
      if (count === 1) {
        await this.client.pexpire(redisKey, windowMs);
      }

      const ttlMs = await this.client.pttl(redisKey);
      const retryAfterMs =
        ttlMs > 0 ? ttlMs : count > maxAttempts ? windowMs : 0;

      if (count > maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - count),
        retryAfterMs: 0,
      };
    } catch (error) {
      logger.error("Redis rate-limit check failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      // Fail closed in production-shaped redis mode — never silently fall back to memory.
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Redis rate-limit store is unavailable.",
        { status: 503 },
      );
    }
  }
}
