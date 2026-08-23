/**
 * Sprint 34C — preview-only test catalog overlay.
 *
 * Effective ONLY when APP_ENV=preview AND PREVIEW_TEST_CATALOG=true.
 * Never writes Thailand Product Master. Never activates Production SKUs.
 * Mock price is isolated and is not a Thailand retail price.
 */

import type { Product } from "@/src/server/models/product";
import { isPublicPreview } from "@/lib/preview/public-preview";

/** Designated preview-test SKU: « Napoléon » Macaron - 8pcs. */
export const PREVIEW_TEST_CATALOG_SKUS = ["LDR003"] as const;

export type PreviewTestCatalogSku = (typeof PREVIEW_TEST_CATALOG_SKUS)[number];

/**
 * Isolated mock price required by the commerce engine.
 * Not a Thailand Product Master price. Not owner-approved retail.
 */
export const PREVIEW_TEST_CATALOG_PRICE_THB = 1;
export const PREVIEW_TEST_CATALOG_PRICE_MINOR = 100;

/**
 * Singapore portal macaron flavor labels (laduree.sg ProductDetail).
 * Same labels as SAMPLE_PRODUCT "Choice of Macarons".
 * Preview overlay only — not written into Thailand Product Master.
 */
export const PREVIEW_TEST_MACARON_FLAVORS: readonly string[] = [
  "Almond",
  "Chocolate",
  "Coffee",
  "« Seasonal » Dubai Chocolate",
  "Lemon",
  "« Asia Exclusive » Matcha",
  "Marie-Antoinette Tea",
  "« Seasonal » Milk Chocolate Coated Coconut",
  "« Seasonal » Milk Chocolate Coated Caramel Peanuts",
  "Orange Blossom",
  "Passion Fruit",
  "Pistachio",
  "Raspberry",
  "Rose",
  "Salted Caramel",
  "Vanilla",
];

export function isPreviewTestCatalogFlagEnabled(
  raw: string | undefined,
): boolean {
  const value = raw?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export function isPreviewTestCatalogEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    isPublicPreview(env.APP_ENV) &&
    isPreviewTestCatalogFlagEnabled(env.PREVIEW_TEST_CATALOG)
  );
}

export function isPreviewTestCatalogSku(
  sku: string | undefined,
): sku is PreviewTestCatalogSku {
  return (
    typeof sku === "string" &&
    (PREVIEW_TEST_CATALOG_SKUS as readonly string[]).includes(sku)
  );
}

function cloneProduct(product: Product): Product {
  return {
    ...product,
    description: [...product.description],
    images: product.images.map((image) => ({ ...image })),
    modifierGroups: product.modifierGroups.map((group) => ({
      ...group,
      options: [...group.options],
      optionDetails: group.optionDetails?.map((detail) => ({ ...detail })),
    })),
  };
}

/** Read-time overlay. Leaves the source Product / Product Master unchanged. */
export function applyPreviewTestCatalogOverlay(
  product: Product,
  env: NodeJS.ProcessEnv = process.env,
): Product {
  if (!isPreviewTestCatalogEnabled(env)) return product;
  if (!isPreviewTestCatalogSku(product.sku)) return product;

  const next = cloneProduct(product);
  next.isActive = true;
  next.available = true;
  next.priceThb = PREVIEW_TEST_CATALOG_PRICE_THB;
  next.priceMinor = PREVIEW_TEST_CATALOG_PRICE_MINOR;
  next.modifierGroups = next.modifierGroups.map((group) => {
    if (group.id !== "macaron-flavors") return group;
    return {
      ...group,
      isActive: true,
      options: [...PREVIEW_TEST_MACARON_FLAVORS],
    };
  });
  return next;
}
