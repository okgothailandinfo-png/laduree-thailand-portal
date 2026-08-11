import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EnvValidationError } from "@/src/server/config/env";
import {
  assertDatabaseSeedAllowed,
  assertHealthPayloadContract,
  assertReadyPayloadContract,
  evaluateRateLimitReadiness,
  getDeployPreflightChecklist,
  getMigrationRecoverySteps,
  isReadyFromChecks,
  resolveSeedAppEnv,
} from "@/src/server/hardening/deploy-readiness";

describe("Sprint 31 — seed production refuse", () => {
  it("resolves production from APP_ENV", () => {
    assert.equal(resolveSeedAppEnv({ APP_ENV: "production" }), "production");
  });

  it("resolves production from NODE_ENV when APP_ENV unset", () => {
    assert.equal(resolveSeedAppEnv({ NODE_ENV: "production" }), "production");
  });

  it("allows development and staging seeds", () => {
    assert.doesNotThrow(() =>
      assertDatabaseSeedAllowed({ APP_ENV: "development" }),
    );
    assert.doesNotThrow(() =>
      assertDatabaseSeedAllowed({ APP_ENV: "staging" }),
    );
    assert.doesNotThrow(() => assertDatabaseSeedAllowed({ APP_ENV: "test" }));
  });

  it("refuses seed when APP_ENV=production", () => {
    assert.throws(
      () => assertDatabaseSeedAllowed({ APP_ENV: "production" }),
      (error: unknown) =>
        error instanceof EnvValidationError &&
        error.message.includes("db:seed is refused"),
    );
  });

  it("refuses seed when NODE_ENV=production without APP_ENV", () => {
    assert.throws(
      () => assertDatabaseSeedAllowed({ NODE_ENV: "production" }),
      EnvValidationError,
    );
  });

  it("refuses seed on unrecognized APP_ENV (fail-closed typo guard)", () => {
    assert.throws(
      () => assertDatabaseSeedAllowed({ APP_ENV: "prod" }),
      (error: unknown) =>
        error instanceof EnvValidationError &&
        error.message.includes("Invalid APP_ENV"),
    );
    assert.throws(
      () => assertDatabaseSeedAllowed({ APP_ENV: "garbage" }),
      EnvValidationError,
    );
  });
});

describe("Sprint 31 — rate-limit readiness evaluation", () => {
  it("fails memory store in strict production", () => {
    assert.equal(
      evaluateRateLimitReadiness({
        rateLimitStore: "memory",
        redisUrl: null,
        isStrictProduction: true,
      }),
      "fail",
    );
  });

  it("allows memory store outside strict production", () => {
    assert.equal(
      evaluateRateLimitReadiness({
        rateLimitStore: "memory",
        redisUrl: null,
        isStrictProduction: false,
      }),
      "ok",
    );
  });

  it("fails redis store without REDIS_URL", () => {
    assert.equal(
      evaluateRateLimitReadiness({
        rateLimitStore: "redis",
        redisUrl: null,
        isStrictProduction: true,
      }),
      "fail",
    );
  });

  it("ok when redis configured and probe omitted (config-only)", () => {
    assert.equal(
      evaluateRateLimitReadiness({
        rateLimitStore: "redis",
        redisUrl: "redis://127.0.0.1:6379",
        isStrictProduction: true,
      }),
      "ok",
    );
  });

  it("propagates redis probe failure (fail-closed, no memory fallback)", () => {
    assert.equal(
      evaluateRateLimitReadiness({
        rateLimitStore: "redis",
        redisUrl: "redis://127.0.0.1:6379",
        isStrictProduction: true,
        redisProbe: "fail",
      }),
      "fail",
    );
  });

  it("propagates redis probe success", () => {
    assert.equal(
      evaluateRateLimitReadiness({
        rateLimitStore: "redis",
        redisUrl: "redis://127.0.0.1:6379",
        isStrictProduction: false,
        redisProbe: "ok",
      }),
      "ok",
    );
  });
});

describe("Sprint 31 — health/ready contracts", () => {
  it("accepts liveness health payload without dependency fields", () => {
    const payload = assertHealthPayloadContract({
      status: "ok",
      version: "0.1.0",
      environment: "development",
      prototypeMode: true,
      timestamp: "2026-08-11T00:00:00.000Z",
      requestId: "req-1",
    });
    assert.equal(payload.status, "ok");
  });

  it("rejects health payload that is not ok", () => {
    assert.throws(() => assertHealthPayloadContract({ status: "down" }));
  });

  it("accepts not_ready readiness without treating it as invalid shape", () => {
    const payload = assertReadyPayloadContract({
      status: "not_ready",
      environment: "production",
      checks: {
        configuration: "fail",
        database: "fail",
        prisma: "fail",
        payment: "fail",
        rateLimit: "fail",
      },
      errors: [],
    });
    assert.equal(payload.status, "not_ready");
  });

  it("rejects ready payload missing checks", () => {
    assert.throws(() =>
      assertReadyPayloadContract({ status: "ready", environment: "staging" }),
    );
  });

  it("rejects payloads that leak connection strings", () => {
    assert.throws(() =>
      assertHealthPayloadContract({
        status: "ok",
        databaseUrl: "postgresql://user:pass@host/db",
      }),
    );
    assert.throws(() =>
      assertReadyPayloadContract({
        status: "not_ready",
        checks: { redis: "redis://secret@host" },
      }),
    );
  });
});

describe("Sprint 31 — ready aggregation + checklists", () => {
  it("requires database+prisma ok in strict production", () => {
    assert.equal(
      isReadyFromChecks(
        true,
        {
          configuration: "ok",
          database: "skip",
          prisma: "skip",
          payment: "ok",
          rateLimit: "ok",
        },
        true,
      ),
      false,
    );
    assert.equal(
      isReadyFromChecks(
        true,
        {
          configuration: "ok",
          database: "ok",
          prisma: "ok",
          payment: "ok",
          rateLimit: "ok",
        },
        true,
      ),
      true,
    );
  });

  it("allows skip checks outside strict production", () => {
    assert.equal(
      isReadyFromChecks(
        true,
        {
          configuration: "ok",
          database: "skip",
          prisma: "skip",
          payment: "ok",
          rateLimit: "ok",
        },
        false,
      ),
      true,
    );
  });

  it("exposes non-empty preflight checklist with no-seed and probes", () => {
    const items = getDeployPreflightChecklist();
    assert.ok(items.length >= 8);
    assert.ok(items.some((item) => item.id === "no-seed-prod"));
    assert.ok(items.some((item) => item.id === "probe-health"));
    assert.ok(items.some((item) => item.id === "probe-ready"));
    assert.ok(items.some((item) => item.id === "db-deploy"));
  });

  it("exposes migration recovery steps", () => {
    const steps = getMigrationRecoverySteps();
    assert.ok(steps.length >= 5);
    assert.ok(steps.some((step) => step.toLowerCase().includes("migrate resolve")));
  });
});
