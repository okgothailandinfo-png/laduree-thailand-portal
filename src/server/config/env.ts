/**
 * Server environment configuration with fail-closed production validation.
 *
 * Mock payment/storage/notification providers are allowed only in
 * development, test, public preview (APP_ENV=preview), and staging.
 * Production refuses mock/local providers and DATA_SOURCE=mock.
 */

import { classifyCanonicalHost } from "@/lib/preview/public-preview";

export type DataSource = "mock" | "prisma";
export type AppEnvName = "development" | "staging" | "preview" | "production" | "test";
/** mock = local/dev; external = production adapter boundary (real vendor module TBD). */
export type PaymentProviderName = "mock" | "external";
export type StorageProviderName = "local" | "external";
export type NotificationProviderName = "mock" | "external";
export type RateLimitStoreName = "memory" | "redis";
export type AdminAuthProviderName = "mock" | "oidc";

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
  orderAccessSecret: string | null;
  rateLimitStore: RateLimitStoreName;
  redisUrl: string | null;
  adminAuthProvider: AdminAuthProviderName;
  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcClientSecret: string | null;
  oidcRedirectUri: string | null;
  oidcScopes: string;
  adminSessionSecret: string | null;
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
    value === "preview" ||
    value === "production" ||
    value === "test"
  ) {
    return value;
  }
  if (value) {
    throw new EnvValidationError(
      `Invalid APP_ENV="${value}". Expected development|staging|preview|production|test.`,
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

function resolveProviderKind(
  value: string | undefined,
  name: string,
  allowsMock: boolean,
): "mock" | "external" {
  const raw = value?.trim().toLowerCase();
  if (!raw || raw === "mock") {
    if (!allowsMock) {
      throw new EnvValidationError(
        `${name}=mock is not allowed in production. Set ${name}=external and register a production adapter.`,
      );
    }
    return "mock";
  }
  if (raw === "external") {
    return "external";
  }
  throw new EnvValidationError(
    `${name}="${raw}" is unsupported. Expected mock|external.`,
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
        "STORAGE_PROVIDER=local is not allowed in production. Set STORAGE_PROVIDER=external and register a cloud adapter.",
      );
    }
    return "local";
  }
  if (raw === "external") {
    return "external";
  }
  throw new EnvValidationError(
    `STORAGE_PROVIDER="${raw}" is unsupported. Expected local|external.`,
  );
}

function resolveAdminAuthProvider(
  value: string | undefined,
  allowsMock: boolean,
): AdminAuthProviderName {
  const raw = (value ?? (allowsMock ? "mock" : "oidc")).trim().toLowerCase();
  if (raw === "mock") {
    if (!allowsMock) {
      throw new EnvValidationError(
        "ADMIN_AUTH_PROVIDER=mock is not allowed in production. Set ADMIN_AUTH_PROVIDER=oidc.",
      );
    }
    return "mock";
  }
  if (raw === "oidc") {
    return "oidc";
  }
  throw new EnvValidationError(
    `ADMIN_AUTH_PROVIDER="${raw}" is unsupported. Expected mock|oidc.`,
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
    throw new EnvValidationError(`${field} must use HTTPS.`);
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
    appEnv === "preview" ||
    appEnv === "test";
  const isStrictProduction = appEnv === "production" && !buildPhase;

  const dataSource = resolveDataSource({
    nodeEnv,
    appEnv,
    buildPhase,
  });

  const paymentProvider = resolveProviderKind(
    process.env.PAYMENT_PROVIDER,
    "PAYMENT_PROVIDER",
    allowsMockProviders,
  );
  const storageProvider = resolveStorageProvider(
    process.env.STORAGE_PROVIDER,
    allowsMockProviders,
  );
  const notificationEmailProvider = resolveProviderKind(
    process.env.NOTIFICATION_EMAIL_PROVIDER,
    "NOTIFICATION_EMAIL_PROVIDER",
    allowsMockProviders,
  );
  const notificationLineProvider = resolveProviderKind(
    process.env.NOTIFICATION_LINE_PROVIDER,
    "NOTIFICATION_LINE_PROVIDER",
    allowsMockProviders,
  );
  const adminAuthProvider = resolveAdminAuthProvider(
    process.env.ADMIN_AUTH_PROVIDER,
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
    orderAccessSecret: process.env.ORDER_ACCESS_SECRET?.trim() || null,
    rateLimitStore,
    redisUrl: process.env.REDIS_URL?.trim() || null,
    adminAuthProvider,
    oidcIssuer: process.env.OIDC_ISSUER?.trim() || null,
    oidcClientId: process.env.OIDC_CLIENT_ID?.trim() || null,
    oidcClientSecret: process.env.OIDC_CLIENT_SECRET?.trim() || null,
    oidcRedirectUri: process.env.OIDC_REDIRECT_URI?.trim() || null,
    oidcScopes:
      process.env.OIDC_SCOPES?.trim() || "openid email profile",
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET?.trim() || null,
    allowsMockProviders,
    isStrictProduction,
  };

  if (isStrictProduction) {
    assertStrictProductionEnv(envConfig);
  } else if (appEnv === "staging") {
    assertStagingEnv(envConfig);
  } else if (appEnv === "preview") {
    assertPublicPreviewEnv(envConfig, buildPhase);
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
  config.pickupRevealSecret = requireSecret(
    config.pickupRevealSecret || undefined,
    "PICKUP_REVEAL_SECRET",
  );
  // Prefer dedicated order-access secret; fall back to pickup reveal secret.
  if (config.orderAccessSecret) {
    requireSecret(config.orderAccessSecret, "ORDER_ACCESS_SECRET");
  }
  if (config.paymentProvider === "mock") {
    requireSecret(
      config.mockPaymentWebhookSecret || undefined,
      "MOCK_PAYMENT_WEBHOOK_SECRET",
    );
  }
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
  if (config.adminAuthProvider !== "oidc") {
    throw new EnvValidationError(
      "ADMIN_AUTH_PROVIDER must be oidc in production.",
    );
  }
  if (
    !config.oidcIssuer ||
    !config.oidcClientId ||
    !config.oidcClientSecret ||
    !config.oidcRedirectUri
  ) {
    throw new EnvValidationError(
      "Production OIDC admin auth requires OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI.",
    );
  }
  requireHttpsBaseUrl(config.oidcIssuer, "OIDC_ISSUER");
  requireSecret(
    config.adminSessionSecret || config.pickupRevealSecret,
    "ADMIN_SESSION_SECRET",
  );
}

function assertPublicPreviewEnv(config: ServerEnv, buildPhase: boolean): void {
  // Public website on a real domain; live commerce remains off.
  if (config.paymentProvider !== "mock") {
    throw new EnvValidationError(
      "Public preview requires PAYMENT_PROVIDER=mock. Do not register a production PSP in this environment.",
    );
  }
  if (process.env.STOREFRONT_INDEXING?.trim() === "live") {
    throw new EnvValidationError(
      "STOREFRONT_INDEXING=live is not allowed in public preview. Indexing stays noindex until live commerce is authorized.",
    );
  }
  if (buildPhase) return;

  config.appBaseUrl = requireHttpsBaseUrl(config.appBaseUrl, "APP_BASE_URL");
  config.notificationBaseUrl = requireHttpsBaseUrl(
    config.notificationBaseUrl,
    "NOTIFICATION_BASE_URL",
  );

  let host: string;
  try {
    host = new URL(config.appBaseUrl).hostname.toLowerCase();
  } catch {
    throw new EnvValidationError("APP_BASE_URL must be a valid absolute HTTPS URL.");
  }
  const hostKind = classifyCanonicalHost(host);
  if (hostKind === "localhost") {
    throw new EnvValidationError(
      "Public preview APP_BASE_URL must be the owner-approved real domain, not localhost.",
    );
  }
  if (hostKind === "singapore") {
    throw new EnvValidationError(
      "APP_BASE_URL must not use the Singapore domain as the Thailand canonical host.",
    );
  }

  // Integrity secrets only — not PSP credentials.
  requireSecret(
    config.mockPaymentWebhookSecret || undefined,
    "MOCK_PAYMENT_WEBHOOK_SECRET",
  );
  if (!config.pickupRevealSecret) {
    config.pickupRevealSecret = requireSecret(
      config.mockPaymentWebhookSecret,
      "PICKUP_REVEAL_SECRET",
    );
  } else {
    config.pickupRevealSecret = requireSecret(
      config.pickupRevealSecret,
      "PICKUP_REVEAL_SECRET",
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
  adminAuthProvider: AdminAuthProviderName;
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
    env.pickupRevealSecret.length >= MIN_SECRET_LENGTH ||
      !env.isStrictProduction,
  );

  return {
    ok: errors.length === 0,
    appEnv: env.appEnv,
    dataSource: env.dataSource,
    paymentProvider: env.paymentProvider,
    storageProvider: env.storageProvider,
    notificationEmailProvider: env.notificationEmailProvider,
    notificationLineProvider: env.notificationLineProvider,
    adminAuthProvider: env.adminAuthProvider,
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

/**
 * True when this process is a non-production prototype/staging candidate.
 * Mock payment and other mock providers are allowed; real PSP is not required.
 */
export function isPrototypeEnvironment(config: ServerEnv = env): boolean {
  return config.allowsMockProviders && !config.isStrictProduction;
}

/**
 * Production blockers remaining after Sprint 26–27 architecture work.
 * Persistence + Redis client + provider/OIDC boundaries are in place;
 * real vendor adapters and credentials remain external dependencies.
 *
 * Absence of a real Thailand PSP is an external production dependency —
 * not a prototype/staging blocker when PAYMENT_PROVIDER=mock.
 */
export const PRODUCTION_BLOCKERS = [
  "Register real Thailand PSP adapter behind PAYMENT_PROVIDER=external (credentials + webhook)",
  "Register real email adapter behind NOTIFICATION_EMAIL_PROVIDER=external",
  "Register cloud storage adapter behind STORAGE_PROVIDER=external (CMS binary upload)",
  "Configure production OIDC IdP (ADMIN_AUTH_PROVIDER=oidc + OIDC_* secrets)",
  "Provision managed PostgreSQL and apply migrations (incl. cart/gateway payment)",
  "Provision Redis and set REDIS_URL for production rate limiting",
  "Owner-approved notification templates and Thailand catalog/pricing content",
  "LINE Login / LINE Messaging (deferred from pickup MVP — architecture preserved)",
  "Real courier dispatch (deferred — delivery code preserved, not Go-Live blocker)",
] as const;

/**
 * Infrastructure not yet provisioned — does not block mock-layer feature work.
 * Sprint 21 Delivery Foundation runs on DATA_SOURCE=mock until these are ready.
 */
export const PENDING_INFRASTRUCTURE = [
  "Approved development PostgreSQL database (DATABASE_URL intentionally empty)",
  "Apply prisma/migrations/20260727220000_delivery_foundation (ServiceType + delivery columns)",
  "Owner-approved delivery zone flat rates for createDeliveryFeeEngine",
] as const;
