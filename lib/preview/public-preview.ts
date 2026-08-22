/**
 * Public Preview operating model (Sprint 34).
 *
 * PUBLIC WEBSITE LIVE = yes (real domain, HTTPS, production Next.js build).
 * LIVE COMMERCE = no (no orders, payments, or SKU activation).
 *
 * Reads process.env at call time so tests can toggle APP_ENV without reloading
 * the cached server env module.
 */

export const PUBLIC_PREVIEW_COMMERCE_CODE = "PREVIEW_COMMERCE_DISABLED" as const;
export const PUBLIC_PREVIEW_ADMIN_CODE = "PREVIEW_ADMIN_DISABLED" as const;

export function isPublicPreview(
  appEnv: string | undefined = process.env.APP_ENV,
): boolean {
  return appEnv?.trim().toLowerCase() === "preview";
}

/** Canonical host classification for public-preview APP_BASE_URL. */
export function classifyCanonicalHost(
  hostname: string,
): "ok" | "localhost" | "singapore" {
  const host = hostname.trim().toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  ) {
    return "localhost";
  }
  if (host === "laduree.sg" || host.endsWith(".laduree.sg")) {
    return "singapore";
  }
  return "ok";
}

/** Indexing is never live in public preview, even if STOREFRONT_INDEXING is mis-set. */
export function isPublicPreviewIndexingClosed(appEnv?: string): boolean {
  return isPublicPreview(appEnv ?? process.env.APP_ENV);
}
