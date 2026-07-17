/**
 * Server environment configuration.
 */

export type DataSource = "mock" | "prisma";

export type ServerEnv = {
  nodeEnv: "development" | "production" | "test";
  appName: string;
  timezone: string;
  currency: "THB";
  logLevel: "debug" | "info" | "warn" | "error";
  databaseUrl: string | null;
  paymentProvider: "mock";
  mockPaymentWebhookSecret: string;
  mockPaymentWebhookToleranceSeconds: number;
};

function resolveNodeEnv(value: string | undefined): ServerEnv["nodeEnv"] {
  if (value === "production" || value === "test") return value;
  return "development";
}

function resolveLogLevel(value: string | undefined): ServerEnv["logLevel"] {
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }
  return resolveNodeEnv(process.env.NODE_ENV) === "production" ? "info" : "debug";
}

function isProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function resolvePaymentProvider(
  value: string | undefined,
): ServerEnv["paymentProvider"] {
  const raw = value?.trim().toLowerCase();
  if (!raw || raw === "mock") return "mock";
  throw new Error(
    `Invalid PAYMENT_PROVIDER="${raw}". Only "mock" is supported in this sprint.`,
  );
}

function resolveWebhookTolerance(value: string | undefined): number {
  if (!value?.trim()) return 300;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      "MOCK_PAYMENT_WEBHOOK_TOLERANCE_SECONDS must be a positive number.",
    );
  }
  return parsed;
}

/**
 * DATA_SOURCE selection:
 * - unset in development/test → mock
 * - unset during `next build` → mock (compile-time only)
 * - unset in production runtime → error (no silent mock fallback)
 * - DATA_SOURCE=mock → mock repositories
 * - DATA_SOURCE=prisma → Prisma repositories (requires DATABASE_URL)
 */
export function resolveDataSource(options?: {
  nodeEnv?: ServerEnv["nodeEnv"];
  dataSource?: string | undefined;
  databaseUrl?: string | undefined;
}): DataSource {
  const nodeEnv = options?.nodeEnv ?? resolveNodeEnv(process.env.NODE_ENV);
  const raw = (options?.dataSource ?? process.env.DATA_SOURCE)?.trim().toLowerCase();
  const databaseUrl = (
    options?.databaseUrl ?? process.env.DATABASE_URL
  )?.trim();

  if (raw === "prisma") {
    if (!databaseUrl) {
      throw new Error(
        "DATA_SOURCE=prisma requires DATABASE_URL to be set. Refusing to start.",
      );
    }
    return "prisma";
  }

  if (raw === "mock") {
    return "mock";
  }

  if (!raw) {
    if (nodeEnv === "production" && !isProductionBuildPhase()) {
      throw new Error(
        "DATA_SOURCE must be set explicitly in production (mock|prisma). Refusing silent mock fallback.",
      );
    }
    return "mock";
  }

  throw new Error(
    `Invalid DATA_SOURCE="${raw}". Expected "mock" or "prisma".`,
  );
}

export const env: ServerEnv = {
  nodeEnv: resolveNodeEnv(process.env.NODE_ENV),
  appName: process.env.APP_NAME ?? "laduree-thailand-pickup",
  timezone: process.env.APP_TIMEZONE ?? "Asia/Bangkok",
  currency: "THB",
  logLevel: resolveLogLevel(process.env.LOG_LEVEL),
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  paymentProvider: resolvePaymentProvider(process.env.PAYMENT_PROVIDER),
  mockPaymentWebhookSecret:
    process.env.MOCK_PAYMENT_WEBHOOK_SECRET?.trim() || "",
  mockPaymentWebhookToleranceSeconds: resolveWebhookTolerance(
    process.env.MOCK_PAYMENT_WEBHOOK_TOLERANCE_SECONDS,
  ),
};

export function getDataSource(): DataSource {
  return resolveDataSource({
    nodeEnv: env.nodeEnv,
    databaseUrl: env.databaseUrl ?? undefined,
  });
}
