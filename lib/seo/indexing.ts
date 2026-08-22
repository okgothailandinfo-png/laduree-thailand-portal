/**
 * Storefront indexing policy — fail-closed until live commerce is authorized.
 *
 * STOREFRONT_INDEXING=live is required in addition to APP_ENV=production.
 * Vercel Production (VERCEL_ENV=production) is not live commerce and does not
 * enable indexing by itself.
 * Safe-Draft / staging / development / public preview never emit public SEO inventory.
 */

import { isPublicPreview } from "@/lib/preview/public-preview";

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

type IndexingEnv = {
  APP_ENV?: string;
  STOREFRONT_INDEXING?: string;
};

/** True only when the owner has authorized public indexing of a live production storefront. */
export function isStorefrontIndexingLive(env?: IndexingEnv): boolean {
  const source = env ?? process.env;
  if (isPublicPreview(source.APP_ENV)) return false;
  return source.APP_ENV === "production" && source.STOREFRONT_INDEXING === "live";
}

export function defaultStorefrontRobots(
  env?: IndexingEnv,
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
