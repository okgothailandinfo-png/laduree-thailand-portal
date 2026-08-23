import { env } from "@/src/server/config/env";
import { isPublicPreview } from "@/lib/preview/public-preview";
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
    const base = new URL(env.appBaseUrl);
    set.add(base.origin);
    if (base.hostname === "ok-go.cloud") {
      set.add("https://www.ok-go.cloud");
    }
    if (base.hostname === "www.ok-go.cloud") {
      set.add("https://ok-go.cloud");
    }
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
  for (const origin of vercelPreviewOrigins(process.env)) {
    set.add(origin);
  }
  return set;
}

/** Preview-only: allow this deployment's Vercel URLs (not arbitrary *.vercel.app). */
export function vercelPreviewOrigins(
  processEnv: NodeJS.ProcessEnv = process.env,
): string[] {
  if (!isPublicPreview(processEnv.APP_ENV)) return [];
  const origins: string[] = [];
  for (const raw of [processEnv.VERCEL_URL, processEnv.VERCEL_BRANCH_URL]) {
    const host = raw?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!host) continue;
    origins.push(`https://${host}`);
  }
  return origins;
}
