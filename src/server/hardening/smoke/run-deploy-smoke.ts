/**
 * Sprint 31 — deploy readiness smoke (no production infra required).
 *
 * Validates:
 * - seed refuse in production
 * - health vs ready payload contracts (no secret leaks)
 * - rate-limit fail-closed evaluation
 * - preflight checklist presence
 * - optional HTTP probes when DEPLOY_SMOKE_BASE_URL is set
 *
 * Run: npm run smoke:deploy
 * Optional: DEPLOY_SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke:deploy
 */

import assert from "node:assert/strict";
import {
  assertDatabaseSeedAllowed,
  assertHealthPayloadContract,
  assertReadyPayloadContract,
  evaluateRateLimitReadiness,
  getDeployPreflightChecklist,
  getMigrationRecoverySteps,
  isReadyFromChecks,
} from "@/src/server/hardening/deploy-readiness";
import { EnvValidationError } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";
import { RedisRateLimitStore } from "@/src/server/http/redis-rate-limit-store";

type Check = { name: string; ok: boolean; detail?: string };

function check(name: string, fn: () => void | Promise<void>): Promise<Check> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => ({ name, ok: true as const }))
    .catch((error: unknown) => ({
      name,
      ok: false as const,
      detail: error instanceof Error ? error.message : String(error),
    }));
}

async function optionalHttpProbes(baseUrl: string): Promise<Check[]> {
  const results: Check[] = [];
  const normalized = baseUrl.replace(/\/$/, "");

  results.push(
    await check("HTTP GET /api/health liveness contract", async () => {
      const response = await fetch(`${normalized}/api/health`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assertHealthPayloadContract(body);
    }),
  );

  results.push(
    await check("HTTP GET /api/ready readiness contract", async () => {
      const response = await fetch(`${normalized}/api/ready`);
      assert.ok(response.status === 200 || response.status === 503);
      const body = await response.json();
      const payload = assertReadyPayloadContract(body);
      if (response.status === 200) {
        assert.equal(payload.status, "ready");
      } else {
        assert.equal(payload.status, "not_ready");
      }
    }),
  );

  return results;
}

async function run(): Promise<void> {
  const results: Check[] = [];

  results.push(
    await check("production seed is refused", () => {
      assert.throws(
        () => assertDatabaseSeedAllowed({ APP_ENV: "production" }),
        EnvValidationError,
      );
      assert.throws(
        () => assertDatabaseSeedAllowed({ APP_ENV: "prod" }),
        EnvValidationError,
      );
    }),
  );

  results.push(
    await check("non-production seed is allowed", () => {
      assertDatabaseSeedAllowed({ APP_ENV: "development" });
    }),
  );

  results.push(
    await check("health payload contract (fixture)", () => {
      assertHealthPayloadContract({
        status: "ok",
        version: "0.1.0",
        environment: "development",
        prototypeMode: true,
        timestamp: new Date().toISOString(),
        requestId: "smoke-health",
      });
    }),
  );

  results.push(
    await check("ready payload contract allows not_ready", () => {
      assertReadyPayloadContract({
        status: "not_ready",
        environment: "production",
        prototypeMode: false,
        checks: {
          configuration: "ok",
          database: "fail",
          prisma: "fail",
          payment: "fail",
          rateLimit: "fail",
        },
        errors: [],
      });
    }),
  );

  results.push(
    await check("redis probe failure stays fail-closed", () => {
      assert.equal(
        evaluateRateLimitReadiness({
          rateLimitStore: "redis",
          redisUrl: "redis://127.0.0.1:6379",
          isStrictProduction: true,
          redisProbe: "fail",
        }),
        "fail",
      );
    }),
  );

  results.push(
    await check("memory rate-limit refused in strict production", () => {
      assert.equal(
        evaluateRateLimitReadiness({
          rateLimitStore: "memory",
          redisUrl: null,
          isStrictProduction: true,
        }),
        "fail",
      );
    }),
  );

    results.push(
    await check("RedisRateLimitStore refuses empty REDIS_URL", () => {
      assert.throws(
        () => new RedisRateLimitStore(""),
        (error: unknown) =>
          error instanceof AppError && error.code === "CONFIG_ERROR",
      );
    }),
  );

  results.push(
    await check("strict production ready requires database ok", () => {
      assert.equal(
        isReadyFromChecks(
          true,
          {
            configuration: "ok",
            database: "fail",
            prisma: "fail",
            payment: "fail",
            rateLimit: "fail",
          },
          true,
        ),
        false,
      );
    }),
  );

  results.push(
    await check("preflight checklist includes no-seed and probes", () => {
      const items = getDeployPreflightChecklist();
      assert.ok(items.some((item) => item.id === "no-seed-prod"));
      assert.ok(items.some((item) => item.id === "probe-health"));
      assert.ok(items.some((item) => item.id === "db-deploy"));
      assert.ok(getMigrationRecoverySteps().length >= 5);
    }),
  );

  const baseUrl = process.env.DEPLOY_SMOKE_BASE_URL?.trim();
  if (baseUrl) {
    results.push(...(await optionalHttpProbes(baseUrl)));
  } else {
    results.push({
      name: "HTTP probes skipped (set DEPLOY_SMOKE_BASE_URL to enable)",
      ok: true,
      detail: "optional",
    });
  }

  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    const mark = item.ok ? "PASS" : "FAIL";
    console.log(
      `${mark}  ${item.name}${item.detail ? ` — ${item.detail}` : ""}`,
    );
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} deploy smoke check(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${results.length} deploy smoke checks passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
