import { NextResponse } from "next/server";
import {
  env,
  getEnvReadiness,
  isPrototypeEnvironment,
  PRODUCTION_BLOCKERS,
} from "@/src/server/config/env";
import { prisma } from "@/src/server/database/prisma";
import {
  evaluateRateLimitReadiness,
  isReadyFromChecks,
  type DeployCheckStatus,
} from "@/src/server/hardening/deploy-readiness";
import { createRequestId, REQUEST_ID_HEADER } from "@/src/server/http/request-context";
import { probeRedisConnectivity } from "@/src/server/http/redis-rate-limit-store";
import { logEvent } from "@/src/server/utils/logger";

/**
 * GET /api/ready — readiness. Returns 200 only when dependencies are ready.
 * Never exposes secrets or raw database URLs.
 *
 * Liveness remains GET /api/health (no dependency checks).
 */
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const config = getEnvReadiness();

  let redisProbe: DeployCheckStatus | undefined;
  if (config.rateLimitStore === "redis") {
    if (!env.redisUrl?.trim()) {
      redisProbe = "fail";
    } else {
      const ok = await probeRedisConnectivity(env.redisUrl);
      redisProbe = ok ? "ok" : "fail";
    }
  }

  const checks: Record<string, DeployCheckStatus> = {
    configuration: config.ok ? "ok" : "fail",
    database: "skip",
    prisma: "skip",
    // Sprint 26: external/OIDC boundaries exist, but real vendor adapters are
    // not registered yet — production readiness stays fail-closed.
    storage: env.isStrictProduction ? "fail" : "ok",
    payment: env.isStrictProduction ? "fail" : "ok",
    notifications: env.isStrictProduction ? "fail" : "ok",
    adminAuth: env.isStrictProduction ? "fail" : "ok",
    rateLimit: evaluateRateLimitReadiness({
      rateLimitStore: config.rateLimitStore,
      redisUrl: env.redisUrl,
      isStrictProduction: env.isStrictProduction,
      redisProbe,
    }),
  };

  if (config.dataSource === "prisma" && config.databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
      checks.prisma = "ok";
    } catch (error) {
      checks.database = "fail";
      checks.prisma = "fail";
      logEvent.databaseUnavailable({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (env.isStrictProduction) {
    checks.database = "fail";
    checks.prisma = "fail";
  }

  const ready = isReadyFromChecks(
    config.ok,
    checks,
    env.isStrictProduction,
  );

  const body = {
    status: ready ? "ready" : "not_ready",
    environment: env.appEnv,
    prototypeMode: isPrototypeEnvironment(),
    timestamp: new Date().toISOString(),
    requestId,
    checks: {
      configuration: checks.configuration,
      database: checks.database,
      prisma: checks.prisma,
      storage: checks.storage,
      payment: checks.payment,
      notifications: checks.notifications,
      adminAuth: checks.adminAuth,
      storageProvider: config.storageProvider,
      paymentProvider: config.paymentProvider,
      notificationEmailProvider: config.notificationEmailProvider,
      notificationLineProvider: config.notificationLineProvider,
      adminAuthProvider: config.adminAuthProvider,
      rateLimitStore: config.rateLimitStore,
      rateLimit: checks.rateLimit,
      dataSource: config.dataSource,
    },
    errors: config.errors,
    ...(env.appEnv !== "production"
      ? { productionBlockers: PRODUCTION_BLOCKERS }
      : {}),
  };

  return NextResponse.json(body, {
    status: ready ? 200 : 503,
    headers: { [REQUEST_ID_HEADER]: requestId },
  });
}
