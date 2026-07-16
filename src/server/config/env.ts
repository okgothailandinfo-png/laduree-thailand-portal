/**
 * Server environment configuration.
 * Placeholder-friendly — no secrets required for the mock foundation.
 */

export type ServerEnv = {
  nodeEnv: "development" | "production" | "test";
  appName: string;
  timezone: string;
  currency: "THB";
  logLevel: "debug" | "info" | "warn" | "error";
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

export const env: ServerEnv = {
  nodeEnv: resolveNodeEnv(process.env.NODE_ENV),
  appName: process.env.APP_NAME ?? "laduree-thailand-pickup",
  timezone: process.env.APP_TIMEZONE ?? "Asia/Bangkok",
  currency: "THB",
  logLevel: resolveLogLevel(process.env.LOG_LEVEL),
};
