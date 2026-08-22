/**
 * Sprint 31 — deploy / migration / readiness helpers (code-only).
 * Pure diagnostics and fail-closed guards. No vendor credentials or production URLs.
 */

import { EnvValidationError } from "@/src/server/config/env";

export type DeployCheckStatus = "ok" | "fail" | "skip";

export type DeployPreflightItem = {
  id: string;
  title: string;
  classification: "code" | "manual" | "external" | "owner";
  detail: string;
};

export type RateLimitReadinessInput = {
  rateLimitStore: "memory" | "redis";
  redisUrl: string | null;
  isStrictProduction: boolean;
  /** When redis is configured, result of an optional connectivity probe. */
  redisProbe?: DeployCheckStatus;
};

/**
 * Resolve the effective APP_ENV for seed / deploy guards.
 * Unrecognized APP_ENV values refuse seed (fail-closed), matching env.ts strictness.
 */
export function resolveSeedAppEnv(env: {
  APP_ENV?: string;
  NODE_ENV?: string;
} = process.env): "development" | "staging" | "preview" | "production" | "test" {
  const raw = env.APP_ENV?.trim().toLowerCase();
  if (
    raw === "development" ||
    raw === "staging" ||
    raw === "preview" ||
    raw === "production" ||
    raw === "test"
  ) {
    return raw;
  }
  if (raw) {
    throw new EnvValidationError(
      `Invalid APP_ENV="${raw}" for db:seed. Expected development|staging|preview|production|test. Refusing seed (fail-closed).`,
    );
  }
  if (env.NODE_ENV === "production") return "production";
  if (env.NODE_ENV === "test") return "test";
  return "development";
}

/**
 * Fail-closed: development seed must never run against production.
 * Production catalog must use an owner-approved controlled load process.
 */
export function assertDatabaseSeedAllowed(env: {
  APP_ENV?: string;
  NODE_ENV?: string;
} = process.env): void {
  const appEnv = resolveSeedAppEnv(env);
  if (appEnv === "production") {
    throw new EnvValidationError(
      "db:seed is refused when APP_ENV=production (or NODE_ENV=production without APP_ENV). Load production catalog via an owner-approved process — never seed placeholders into production.",
    );
  }
}

/**
 * Rate-limit readiness for /api/ready.
 * Memory is refused in strict production. Redis never silently falls back to memory.
 */
export function evaluateRateLimitReadiness(
  input: RateLimitReadinessInput,
): DeployCheckStatus {
  if (input.rateLimitStore === "memory") {
    return input.isStrictProduction ? "fail" : "ok";
  }

  if (!input.redisUrl?.trim()) {
    return "fail";
  }

  if (input.redisProbe === undefined) {
    // Config present but probe not run — treat as ok for config-only mode.
    return "ok";
  }

  return input.redisProbe;
}

/**
 * Ordered cutover checklist (platform-agnostic). Does not invent hosting choices.
 */
export function getDeployPreflightChecklist(): DeployPreflightItem[] {
  return [
    {
      id: "secrets-manager",
      title: "Load secrets from a secrets manager into process env",
      classification: "external",
      detail:
        "DATABASE_URL, REDIS_URL, PICKUP_REVEAL_SECRET, ORDER_ACCESS_SECRET, OIDC_*, provider secrets. Never commit credentials.",
    },
    {
      id: "app-env-production",
      title: "Set APP_ENV=production with fail-closed providers",
      classification: "manual",
      detail:
        "DATA_SOURCE=prisma, RATE_LIMIT_STORE=redis, ADMIN_AUTH_PROVIDER=oidc, PAYMENT/STORAGE/NOTIFICATION providers = external (once adapters registered).",
    },
    {
      id: "npm-ci",
      title: "Install locked dependencies",
      classification: "manual",
      detail: "npm ci",
    },
    {
      id: "prisma-generate",
      title: "Generate Prisma client",
      classification: "code",
      detail: "npm run prisma:generate",
    },
    {
      id: "db-status",
      title: "Inspect migration status before deploy",
      classification: "manual",
      detail:
        "npm run db:status — requires approved DATABASE_URL. Do not invent connection strings.",
    },
    {
      id: "db-deploy",
      title: "Apply committed migrations forward-only",
      classification: "manual",
      detail:
        "npm run db:deploy (prisma migrate deploy). Never use prisma migrate dev against shared/prod.",
    },
    {
      id: "no-seed-prod",
      title: "Do not run db:seed against production",
      classification: "code",
      detail:
        "Seed is refused when APP_ENV=production. Catalog load is an owner-approved process.",
    },
    {
      id: "build-start",
      title: "Build and start the Node process",
      classification: "manual",
      detail: "npm run build && npm run start (or host-equivalent).",
    },
    {
      id: "probe-health",
      title: "Probe liveness GET /api/health",
      classification: "code",
      detail: "Expect HTTP 200. Liveness must not depend on Redis/DB/providers.",
    },
    {
      id: "probe-ready",
      title: "Probe readiness GET /api/ready",
      classification: "code",
      detail:
        "Expect 503 until real providers + DB are ready. Never treat 503 as a process crash.",
    },
    {
      id: "post-deploy-smoke",
      title: "Run post-deploy smoke packaging",
      classification: "code",
      detail: "npm run smoke:deploy (optional DEPLOY_SMOKE_BASE_URL for HTTP probes).",
    },
    {
      id: "rollback-decision",
      title: "Know the rollback decision tree before cutover",
      classification: "owner",
      detail:
        "See docs/sprint-31-deployment-readiness.md — migration resolve vs app rollback vs DB restore (PITR is owner/infra).",
    },
  ];
}

/** Migration recovery steps — documentation as structured data for smoke/docs. */
export function getMigrationRecoverySteps(): string[] {
  return [
    "Stop rolling out new app instances if migrate deploy failed mid-cutover.",
    "Capture prisma migrate status output and the exact error (no secrets in tickets).",
    "If migration recorded as failed but SQL partially applied: use prisma migrate resolve carefully after DBA review.",
    "Prefer forward-fix migrations over destructive down migrations.",
    "App rollback (previous image/build) is safe only when the new migration is backward-compatible (expand/contract).",
    "Schema restore from backup/PITR requires owner-approved RPO/RTO and infra — not an app code path.",
    "Re-run db:status, then db:deploy, then health/ready probes before resuming traffic.",
  ];
}

export type HealthPayload = {
  status: string;
  version?: string;
  environment?: string;
  prototypeMode?: boolean;
  timestamp?: string;
  requestId?: string;
};

export type ReadyPayload = {
  status: string;
  environment?: string;
  prototypeMode?: boolean;
  timestamp?: string;
  requestId?: string;
  checks?: Record<string, unknown>;
  errors?: unknown;
  productionBlockers?: unknown;
};

/**
 * Validate liveness payload shape. Must never require dependency fields.
 */
export function assertHealthPayloadContract(body: unknown): HealthPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Health payload must be an object.");
  }
  const payload = body as HealthPayload;
  if (payload.status !== "ok") {
    throw new Error(`Health status must be "ok", got ${String(payload.status)}`);
  }
  const serialized = JSON.stringify(body);
  assertNoSecretLeak(serialized, "health");
  return payload;
}

/**
 * Validate readiness payload shape. Separates liveness from dependency readiness.
 */
export function assertReadyPayloadContract(body: unknown): ReadyPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Ready payload must be an object.");
  }
  const payload = body as ReadyPayload;
  if (payload.status !== "ready" && payload.status !== "not_ready") {
    throw new Error(
      `Ready status must be "ready" or "not_ready", got ${String(payload.status)}`,
    );
  }
  if (!payload.checks || typeof payload.checks !== "object") {
    throw new Error("Ready payload must include checks object.");
  }
  const serialized = JSON.stringify(body);
  assertNoSecretLeak(serialized, "ready");
  return payload;
}

function assertNoSecretLeak(serialized: string, label: string): void {
  const lowered = serialized.toLowerCase();
  const forbidden = [
    "password=",
    "postgresql://",
    "redis://",
    "client_secret",
    "pickup_reveal",
    "webhook_secret",
    "bearer ",
  ];
  for (const token of forbidden) {
    if (lowered.includes(token)) {
      throw new Error(
        `${label} payload appears to leak sensitive material (${token.trim()}).`,
      );
    }
  }
}

/**
 * Decide whether /api/ready should report ready given check map.
 * Preserves Sprint 20B semantics: skip is allowed; fail is not.
 */
export function isReadyFromChecks(
  configOk: boolean,
  checks: Record<string, DeployCheckStatus>,
  isStrictProduction: boolean,
): boolean {
  if (!configOk) return false;
  const values = Object.values(checks);
  if (!values.every((value) => value === "ok" || value === "skip")) {
    return false;
  }
  if (isStrictProduction) {
    return checks.database === "ok" && checks.prisma === "ok";
  }
  return true;
}
