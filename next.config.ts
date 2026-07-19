import type { NextConfig } from "next";

/**
 * Security headers live here (not imported from src/server) so next.config
 * evaluation does not pull the application graph into the config bundle.
 *
 * CSP temporary exceptions are documented in docs/production-hardening.md.
 */
function buildSecurityHeaders(): { key: string; value: string }[] {
  const appEnv =
    process.env.APP_ENV?.trim().toLowerCase() ||
    (process.env.NODE_ENV === "production" ? "production" : "development");

  const csp = [
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
    ...(appEnv === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const headers: { key: string; value: string }[] = [
    { key: "Content-Security-Policy", value: csp },
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

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
