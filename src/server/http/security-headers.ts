/**
 * Security headers for Next.js `headers()` config and runtime checks.
 *
 * CSP notes / temporary exceptions:
 * - `script-src 'self' 'unsafe-inline'` — Next.js App Router / React hydration
 *   still emits inline bootstrap scripts in this deployment mode.
 * - `style-src 'self' 'unsafe-inline'` — Tailwind/runtime style injection.
 * - `img-src` allows https: and blob: for CMS media previews and QR data URLs.
 * - `connect-src 'self'` — same-origin API only.
 * Tighten further when a nonce-based CSP pipeline is available.
 */

function resolveAppEnvForHeaders(): string {
  const raw = process.env.APP_ENV?.trim().toLowerCase();
  if (
    raw === "development" ||
    raw === "staging" ||
    raw === "production" ||
    raw === "test"
  ) {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function buildContentSecurityPolicy(
  appEnv: string = resolveAppEnvForHeaders(),
): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
  ];
  if (appEnv === "production") {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

export function buildSecurityHeaders(
  appEnv: string = resolveAppEnvForHeaders(),
): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(appEnv),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  ];

  if (appEnv === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
