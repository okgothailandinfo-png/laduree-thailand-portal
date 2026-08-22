/**
 * Storefront browse vs purchase visibility.
 * Purchase remains gated by evaluateProductPurchasability (Sprint 33C).
 */

import { isThailandMasterSku } from "@/lib/catalog/thailand-product-import";

export type StorefrontVisibilityProduct = {
  sku?: string;
  isActive: boolean;
  available: boolean;
};

/** Active + available — the production listing contract. */
export function isLiveListedProduct(
  product: StorefrontVisibilityProduct,
): boolean {
  return product.isActive === true && product.available === true;
}

/**
 * PDP / slug visibility.
 * Production: live listed only (drafts 404 — no public SEO inventory).
 * Non-production: live listed OR Thailand master SKUs (Safe-Draft catalog QA).
 */
export function isStorefrontPdpVisible(
  product: StorefrontVisibilityProduct,
  appEnv: string | undefined = process.env.APP_ENV,
): boolean {
  if (isLiveListedProduct(product)) return true;
  if (appEnv === "production") return false;
  return typeof product.sku === "string" && isThailandMasterSku(product.sku);
}

/** Card / PDP "Unavailable" affordance (Singapore wording). */
export function isStorefrontUnavailableDisplay(product: {
  available: boolean;
  priceThb: number | null;
}): boolean {
  return (
    !product.available ||
    product.priceThb === null ||
    product.priceThb <= 0
  );
}

export function categoryPath(slug: string): string {
  if (slug === "all-items") return "/Category";
  return `/Category/${slug}`;
}
