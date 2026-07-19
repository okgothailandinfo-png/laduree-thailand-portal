import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Origin/Referer validation for cookie-authenticated state-changing requests.
 * Development allows missing Origin on same-host tools; production/staging require a match.
 */
export function assertCsrfOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = allowedOrigins();

  if (origin) {
    if (!allowed.has(origin)) {
      throw new AppError("FORBIDDEN", "Invalid request origin.");
    }
    return;
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!allowed.has(refOrigin)) {
        throw new AppError("FORBIDDEN", "Invalid request referer.");
      }
      return;
    } catch {
      throw new AppError("FORBIDDEN", "Invalid request referer.");
    }
  }

  // Local development: some same-origin tools omit Origin.
  if (env.appEnv === "development" || env.appEnv === "test") {
    return;
  }

  throw new AppError("FORBIDDEN", "Missing request origin.");
}

function allowedOrigins(): Set<string> {
  const set = new Set<string>();
  try {
    set.add(new URL(env.appBaseUrl).origin);
  } catch {
    // ignore invalid base
  }
  try {
    set.add(new URL(env.notificationBaseUrl).origin);
  } catch {
    // ignore
  }
  if (env.appEnv === "development" || env.appEnv === "test") {
    set.add("http://localhost:3000");
    set.add("http://127.0.0.1:3000");
  }
  return set;
}
