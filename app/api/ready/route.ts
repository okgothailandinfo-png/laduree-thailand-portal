import { NextResponse } from "next/server";
import {
  env,
  getEnvReadiness,
  PRODUCTION_BLOCKERS,
} from "@/src/server/config/env";
import { prisma } from "@/src/server/database/prisma";
import { createRequestId, REQUEST_ID_HEADER } from "@/src/server/http/request-context";
import { logEvent } from "@/src/server/utils/logger";

/**
 * GET /api/ready — readiness. Returns 200 only when dependencies are ready.
 * Never exposes secrets or raw database URLs.
 */
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const config = getEnvReadiness();
  const checks: Record<string, "ok" | "fail" | "skip"> = {
    configuration: config.ok ? "ok" : "fail",
    database: "skip",
    prisma: "skip",
    storage: config.storageProvider === "local" && env.isStrictProduction
      ? "fail"
      : "ok",
    payment: config.paymentProvider === "mock" && env.isStrictProduction
      ? "fail"
      : "ok",
    notifications:
      (config.notificationEmailProvider === "mock" ||
        config.notificationLineProvider === "mock") &&
      env.isStrictProduction
        ? "fail"
        : "ok",
    rateLimit:
      config.rateLimitStore === "memory" && env.isStrictProduction
        ? "fail"
        : "ok",
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

  const ready =
    config.ok &&
    Object.values(checks).every((value) => value === "ok" || value === "skip") &&
    (!env.isStrictProduction ||
      (checks.database === "ok" && checks.prisma === "ok"));

  const body = {
    status: ready ? "ready" : "not_ready",
    environment: env.appEnv,
    timestamp: new Date().toISOString(),
    requestId,
    checks: {
      configuration: checks.configuration,
      database: checks.database,
      prisma: checks.prisma,
      storageProvider: config.storageProvider,
      paymentProvider: config.paymentProvider,
      notificationEmailProvider: config.notificationEmailProvider,
      notificationLineProvider: config.notificationLineProvider,
      rateLimitStore: config.rateLimitStore,
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
