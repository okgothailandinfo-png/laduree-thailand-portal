/**
 * Server environment configuration with fail-closed production validation.
 *
 * Mock payment/storage/notification providers are allowed only in
 * development, test, and explicitly configured staging (APP_ENV=staging).
 * Production refuses mock/local providers and DATA_SOURCE=mock.
 */

export type DataSource = "mock" | "prisma";
export type AppEnvName = "development" | "staging" | "production" | "test";
export type PaymentProviderName = "mock";
export type StorageProviderName = "local";
export type NotificationProviderName = "mock";
export type RateLimitStoreName = "memory" | "redis";

export type ServerEnv = {
  nodeEnv: "development" | "production" | "test";
  appEnv: AppEnvName;
  appName: string;
  appBaseUrl: string;
  timezone: string;
  currency: "THB";
  logLevel: "debug" | "info" | "warn" | "error";
  databaseUrl: string | null;
  dataSource: DataSource;
  paymentProvider: PaymentProviderName;
  mockPaymentWebhookSecret: string;
  mockPaymentWebhookToleranceSeconds: number;
  storageProvider: StorageProviderName;
  mediaMaxFileSizeMb: number;
  mediaLocalUploadDir: string;
  notificationEmailProvider: NotificationProviderName;
  notificationLineProvider: NotificationProviderName;
  notificationMaxAttempts: number;
  notificationProcessLimit: number;
  notificationBaseUrl: string;
  notificationMockForceFailure: boolean;
  pickupRevealSecret: string;
  rateLimitStore: RateLimitStoreName;
  redisUrl: string | null;
  allowsMockProviders: boolean;
  isStrictProduction: boolean;
};

const MIN_SECRET_LENGTH = 16;

export class EnvValidationError extends Error {
  readonly code = "CONFIG_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

export function isProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function resolveNodeEnv(value: string | undefined): ServerEnv["nodeEnv"] {
  if (value === "production" || value === "test") return value;
  return "development";
}

function resolveAppEnv(
  nodeEnv: ServerEnv["nodeEnv"],
  raw: string | undefined,
): AppEnvName {
  const value = raw?.trim().toLowerCase();
  if (
    value === "development" ||
    value === "staging" ||
    value === "production" ||
    value === "test"
  ) {
    return value;
  }
  if (value) {
    throw new EnvValidationError(
      `Invalid APP_ENV="${value}". Expected development|staging|production|test.`,
    );
  }
  if (nodeEnv === "production") return "production";
  if (nodeEnv === "test") return "test";
  return "development";
}

function resolveLogLevel(
  value: string | undefined,
  nodeEnv: ServerEnv["nodeEnv"],
): ServerEnv["logLevel"] {
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }
  return nodeEnv === "production" ? "info" : "debug";
}

function resolvePositiveInt(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new EnvValidationError(`${name} must be a positive number.`);
  }
  return Math.floor(parsed);
}

function resolveWebhookTolerance(value: string | undefined): number {
  if (!value?.trim()) return 300;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new EnvValidationError(
      "MOCK_PAYMENT_WEBHOOK_TOLERANCE_SECONDS must be a positive number.",
    );
  }
  return parsed;
}

function resolveMockOnlyProvider(
  value: string | undefined,
  name: string,
  allowsMock: boolean,
): "mock" {
  const raw = value?.trim().toLowerCase();
  if (!raw || raw === "mock") {
    if (!allowsMock) {
      throw new EnvValidationError(
        `${name}=mock is not allowed in production. Configure a real provider (Production Blocker).`,
      );
    }
    return "mock";
  }
  throw new EnvValidationError(
    `${name}="${raw}" is not implemented. This is a Production Blocker.`,
  );
}

function resolveStorageProvider(
  value: string | undefined,
  allowsLocal: boolean,
): StorageProviderName {
  const raw = (value ?? "local").trim().toLowerCase();
  if (raw === "local") {
    if (!allowsLocal) {
      throw new EnvValidationError(
        "STORAGE_PROVIDER=local is not allowed in production. Configure cloud storage (Production Blocker).",
      );
    }
    return "local";
  }
  throw new EnvValidationError(
    `STORAGE_PROVIDER="${raw}" is not implemented. Cloud storage is a Production Blocker.`,
  );
}

function resolveRateLimitStore(
  value: string | undefined,
  allowsMemory: boolean,
): RateLimitStoreName {
  const raw = (value ?? (allowsMemory ? "memory" : "")).trim().toLowerCase();
  if (raw === "memory") return "memory";
  if (raw === "redis") return "redis";
  if (!raw && !allowsMemory) {
    throw new EnvValidationError(
      "RATE_LIMIT_STORE must be set to redis in production (memory is development/staging-only).",
    );
  }
  throw new EnvValidationError(
    `Invalid RATE_LIMIT_STORE="${raw}". Expected memory|redis.`,
  );
}

/**
 * DATA_SOURCE selection:
 * - unset in development/test/staging → mock
 * - unset during `next build` → mock (compile-time only)
 * - production runtime → must be prisma (fail-closed)
 * - DATA_SOURCE=mock → mock repositories (rejected in production)
 * - DATA_SOURCE=prisma → Prisma repositories (requires DATABASE_URL)
 */
export function resolveDataSource(options?: {
  nodeEnv?: ServerEnv["nodeEnv"];
  appEnv?: AppEnvName;
  dataSource?: string | undefined;
  databaseUrl?: string | undefined;
  buildPhase?: boolean;
}): DataSource {
  const nodeEnv = options?.nodeEnv ?? resolveNodeEnv(process.env.NODE_ENV);
  const appEnv =
    options?.appEnv ?? resolveAppEnv(nodeEnv, process.env.APP_ENV);
  const buildPhase = options?.buildPhase ?? isProductionBuildPhase();
  const raw = (options?.dataSource ?? process.env.DATA_SOURCE)?.trim().toLowerCase();
  const databaseUrl = (
    options?.databaseUrl ?? process.env.DATABASE_URL
  )?.trim();

  if (raw === "prisma") {
    if (!databaseUrl) {
      throw new EnvValidationError(
        "DATA_SOURCE=prisma requires DATABASE_URL to be set. Refusing to start.",
      );
    }
    return "prisma";
  }

  if (raw === "mock") {
    if (appEnv === "production" && !buildPhase) {
      throw new EnvValidationError(
        "DATA_SOURCE=mock is not allowed in production. Set DATA_SOURCE=prisma.",
      );
    }
    return "mock";
  }

  if (!raw) {
    if (appEnv === "production" && !buildPhase) {
      throw new EnvValidationError(
        "DATA_SOURCE must be set to prisma in production. Refusing silent mock fallback.",
      );
    }
    return "mock";
  }

  throw new EnvValidationError(
    `Invalid DATA_SOURCE="${raw}". Expected "mock" or "prisma".`,
  );
}

function requireHttpsBaseUrl(url: string, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new EnvValidationError(`${field} must be a valid absolute URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new EnvValidationError(`${field} must use HTTPS in production.`);
  }
  return url.replace(/\/$/, "");
}

function requireSecret(value: string | undefined, name: string): string {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    throw new EnvValidationError(`${name} is required and must not be empty.`);
  }
  if (trimmed.length < MIN_SECRET_LENGTH) {
    throw new EnvValidationError(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }
  if (
    trimmed.includes("dev-only") ||
    trimmed.includes("not-for-production") ||
    trimmed === "dev-webhook-secret"
  ) {
    throw new EnvValidationError(
      `${name} must not use a development placeholder value.`,
    );
  }
  return trimmed;
}

function loadEnv(): ServerEnv {
  const nodeEnv = resolveNodeEnv(process.env.NODE_ENV);
  const appEnv = resolveAppEnv(nodeEnv, process.env.APP_ENV);
  const buildPhase = isProductionBuildPhase();
  const allowsMockProviders =
    buildPhase ||
    appEnv === "development" ||
    appEnv === "staging" ||
    appEnv === "test";
  const isStrictProduction = appEnv === "production" && !buildPhase;

  const dataSource = resolveDataSource({
    nodeEnv,
    appEnv,
    buildPhase,
  });

  const paymentProvider = resolveMockOnlyProvider(
    process.env.PAYMENT_PROVIDER,
    "PAYMENT_PROVIDER",
    allowsMockProviders,
  );
  const storageProvider = resolveStorageProvider(
    process.env.STORAGE_PROVIDER,
    allowsMockProviders,
  );
  const notificationEmailProvider = resolveMockOnlyProvider(
    process.env.NOTIFICATION_EMAIL_PROVIDER,
    "NOTIFICATION_EMAIL_PROVIDER",
    allowsMockProviders,
  );
  const notificationLineProvider = resolveMockOnlyProvider(
    process.env.NOTIFICATION_LINE_PROVIDER,
    "NOTIFICATION_LINE_PROVIDER",
    allowsMockProviders,
  );

  const appBaseUrlRaw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NOTIFICATION_BASE_URL?.trim() ||
    "http://localhost:3000";

  const rateLimitStore = resolveRateLimitStore(
    process.env.RATE_LIMIT_STORE,
    allowsMockProviders,
  );

  const envConfig: ServerEnv = {
    nodeEnv,
    appEnv,
    appName: process.env.APP_NAME?.trim() || "laduree-thailand-pickup",
    appBaseUrl: appBaseUrlRaw.replace(/\/$/, ""),
    timezone: process.env.APP_TIMEZONE?.trim() || "Asia/Bangkok",
    currency: "THB",
    logLevel: resolveLogLevel(process.env.LOG_LEVEL, nodeEnv),
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    dataSource,
    paymentProvider,
    mockPaymentWebhookSecret:
      process.env.MOCK_PAYMENT_WEBHOOK_SECRET?.trim() || "",
    mockPaymentWebhookToleranceSeconds: resolveWebhookTolerance(
      process.env.MOCK_PAYMENT_WEBHOOK_TOLERANCE_SECONDS,
    ),
    storageProvider,
    mediaMaxFileSizeMb: resolvePositiveInt(
      process.env.MEDIA_MAX_FILE_SIZE_MB,
      10,
      "MEDIA_MAX_FILE_SIZE_MB",
    ),
    mediaLocalUploadDir:
      process.env.MEDIA_LOCAL_UPLOAD_DIR?.trim() || "public/uploads",
    notificationEmailProvider,
    notificationLineProvider,
    notificationMaxAttempts: resolvePositiveInt(
      process.env.NOTIFICATION_MAX_ATTEMPTS,
      3,
      "NOTIFICATION_MAX_ATTEMPTS",
    ),
    notificationProcessLimit: resolvePositiveInt(
      process.env.NOTIFICATION_PROCESS_LIMIT,
      20,
      "NOTIFICATION_PROCESS_LIMIT",
    ),
    notificationBaseUrl: (
      process.env.NOTIFICATION_BASE_URL?.trim() || appBaseUrlRaw
    ).replace(/\/$/, ""),
    notificationMockForceFailure:
      process.env.NOTIFICATION_MOCK_FORCE_FAILURE?.trim().toLowerCase() ===
      "true",
    pickupRevealSecret: process.env.PICKUP_REVEAL_SECRET?.trim() || "",
    rateLimitStore,
    redisUrl: process.env.REDIS_URL?.trim() || null,
    allowsMockProviders,
    isStrictProduction,
  };

  if (isStrictProduction) {
    assertStrictProductionEnv(envConfig);
  } else if (appEnv === "staging") {
    assertStagingEnv(envConfig);
  }

  return envConfig;
}

function assertStrictProductionEnv(config: ServerEnv): void {
  // Provider mock/local refusal is enforced in resolvers when allowsMockProviders=false.
  if (config.dataSource !== "prisma") {
    throw new EnvValidationError(
      "DATA_SOURCE must be prisma in production.",
    );
  }
  if (!config.databaseUrl) {
    throw new EnvValidationError("DATABASE_URL is required in production.");
  }
  config.appBaseUrl = requireHttpsBaseUrl(config.appBaseUrl, "APP_BASE_URL");
  config.notificationBaseUrl = requireHttpsBaseUrl(
    config.notificationBaseUrl,
    "NOTIFICATION_BASE_URL",
  );
  requireSecret(config.mockPaymentWebhookSecret, "MOCK_PAYMENT_WEBHOOK_SECRET");
  config.pickupRevealSecret = requireSecret(
    config.pickupRevealSecret || undefined,
    "PICKUP_REVEAL_SECRET",
  );
  if (config.rateLimitStore === "memory") {
    throw new EnvValidationError(
      "RATE_LIMIT_STORE=memory is not allowed in production. Set RATE_LIMIT_STORE=redis and REDIS_URL.",
    );
  }
  if (!config.redisUrl) {
    throw new EnvValidationError(
      "REDIS_URL is required when RATE_LIMIT_STORE=redis.",
    );
  }
}

function assertStagingEnv(config: ServerEnv): void {
  // Staging may use mock providers intentionally. Secrets still required when mock payment/webhook is used.
  if (config.paymentProvider === "mock") {
    requireSecret(
      config.mockPaymentWebhookSecret || undefined,
      "MOCK_PAYMENT_WEBHOOK_SECRET",
    );
  }
  if (!config.pickupRevealSecret) {
    // Prefer explicit secret; fall back to webhook secret already validated above when present.
    if (config.mockPaymentWebhookSecret.length >= MIN_SECRET_LENGTH) {
      config.pickupRevealSecret = config.mockPaymentWebhookSecret;
    } else {
      throw new EnvValidationError(
        "PICKUP_REVEAL_SECRET is required in staging (or a valid MOCK_PAYMENT_WEBHOOK_SECRET).",
      );
    }
  } else {
    config.pickupRevealSecret = requireSecret(
      config.pickupRevealSecret,
      "PICKUP_REVEAL_SECRET",
    );
  }
}

let cachedEnv: ServerEnv | null = null;
let validated = false;

/** Parsed environment. Production fail-closed checks run at load when applicable. */
export const env: ServerEnv = loadEnv();
cachedEnv = env;
validated = true;

/**
 * Re-validate runtime configuration (safe to call repeatedly).
 * Skips fail-closed checks during `next build`.
 */
export function assertRuntimeEnv(): ServerEnv {
  if (validated && cachedEnv) return cachedEnv;
  cachedEnv = loadEnv();
  validated = true;
  return cachedEnv;
}

/** Machine-readable readiness snapshot — never includes secret values. */
export function getEnvReadiness(): {
  ok: boolean;
  appEnv: AppEnvName;
  dataSource: DataSource;
  paymentProvider: string;
  storageProvider: string;
  notificationEmailProvider: string;
  notificationLineProvider: string;
  rateLimitStore: RateLimitStoreName;
  appBaseUrlConfigured: boolean;
  databaseConfigured: boolean;
  secretsConfigured: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  try {
    assertRuntimeEnv();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const secretsConfigured = Boolean(
    env.mockPaymentWebhookSecret.length >= MIN_SECRET_LENGTH &&
      (env.pickupRevealSecret.length >= MIN_SECRET_LENGTH ||
        !env.isStrictProduction),
  );

  return {
    ok: errors.length === 0,
    appEnv: env.appEnv,
    dataSource: env.dataSource,
    paymentProvider: env.paymentProvider,
    storageProvider: env.storageProvider,
    notificationEmailProvider: env.notificationEmailProvider,
    notificationLineProvider: env.notificationLineProvider,
    rateLimitStore: env.rateLimitStore,
    appBaseUrlConfigured: Boolean(env.appBaseUrl),
    databaseConfigured: Boolean(env.databaseUrl),
    secretsConfigured,
    errors,
  };
}

export function getDataSource(): DataSource {
  return resolveDataSource({
    nodeEnv: env.nodeEnv,
    appEnv: env.appEnv,
    databaseUrl: env.databaseUrl ?? undefined,
  });
}

/** Production blockers that remain after this hardening sprint. */
export const PRODUCTION_BLOCKERS = [
  "Real admin authentication provider (replace mock session cookie)",
  "Real payment provider (Omise/Stripe/etc.) — mock payment refused in production",
  "Cloud storage provider (S3/GCS/etc.) — local storage refused in production",
  "Real notification email provider (SendGrid/SES/SMTP)",
  "Real LINE Messaging API provider",
  "Persistent cart store under DATA_SOURCE=prisma",
  "Persistent gateway payment records under DATA_SOURCE=prisma",
  "Redis/Upstash rate-limit client wiring (config fail-closed; client not implemented)",
  "Customer order access control (capability token / signed link) for IDOR hardening",
] as const;
