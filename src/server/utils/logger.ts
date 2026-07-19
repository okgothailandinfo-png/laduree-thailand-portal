import { env } from "@/src/server/config/env";
import { getRequestId } from "@/src/server/http/request-context";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|cookie|session|pickup.?code|qr|card|cvv|pan|webhook|email|phone|mobile|recipient|body|payload/i;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[env.logLevel];
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }
  if (value && typeof value === "object") {
    return redactObject(value as Record<string, unknown>);
  }
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 120)}…[truncated]`;
  }
  return value;
}

function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

function write(level: LogLevel, message: string, meta?: unknown) {
  if (!shouldLog(level)) return;

  const safeMeta =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? redactObject(meta as Record<string, unknown>)
      : meta !== undefined
        ? { value: redactValue("value", meta) }
        : undefined;

  const entry = {
    level,
    message,
    app: env.appName,
    appEnv: env.appEnv,
    requestId: getRequestId(),
    timestamp: new Date().toISOString(),
    ...(safeMeta !== undefined ? { meta: safeMeta } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
};

/** Structured operational events for production monitoring. */
export const logEvent = {
  apiCompleted: (meta: {
    method: string;
    path: string;
    status: number;
    durationMs: number;
  }) => logger.info("api.request.completed", meta),
  apiFailed: (meta: {
    method: string;
    path: string;
    status: number;
    code?: string;
    durationMs: number;
  }) => logger.warn("api.request.failed", meta),
  databaseUnavailable: (meta?: unknown) =>
    logger.error("database.unavailable", meta),
  paymentWebhookRejected: (meta?: unknown) =>
    logger.warn("payment.webhook.rejected", meta),
  pickupVerificationRejected: (meta?: unknown) =>
    logger.warn("pickup.verification.rejected", meta),
  mediaUploadRejected: (meta?: unknown) =>
    logger.warn("media.upload.rejected", meta),
  notificationProcessingFailed: (meta?: unknown) =>
    logger.error("notification.processing.failed", meta),
};
