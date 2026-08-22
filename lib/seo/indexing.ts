/**
 * Storefront indexing policy — fail-closed until live commerce is authorized.
 *
 * STOREFRONT_INDEXING=live is required in addition to APP_ENV=production.
 * Safe-Draft / staging / development never emit public SEO inventory.
 */

export const SITE_NAME = "Ladurée Thailand";

/** Existing system description from root metadata — not new marketing copy. */
export const SITE_DESCRIPTION =
  "Order in advance and collect at your preferred boutique.";

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
} as const;

export const INDEX_ROBOTS = {
  index: true,
  follow: true,
} as const;

export function getMetadataBaseUrl(): string {
  const raw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NOTIFICATION_BASE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** True only when the owner has authorized public indexing of a live production storefront. */
export function isStorefrontIndexingLive(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.APP_ENV === "production" && env.STOREFRONT_INDEXING === "live"
  );
}

export function defaultStorefrontRobots(
  env: NodeJS.ProcessEnv = process.env,
): typeof INDEX_ROBOTS | typeof NOINDEX_ROBOTS {
  return isStorefrontIndexingLive(env) ? INDEX_ROBOTS : NOINDEX_ROBOTS;
}

export const TRANSACTIONAL_ROBOTS_DISALLOW = [
  "/admin",
  "/api",
  "/checkout",
  "/payment",
  "/sign-in",
  "/account",
  "/order-history",
  "/order-confirmation",
  "/order-completed",
] as const;
