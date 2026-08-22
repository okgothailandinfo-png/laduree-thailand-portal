/**
 * Sprint 33C — fail-closed purchasability gates for Thailand catalog.
 * Browse visibility and purchasability are independent.
 */

import {
  usesExactSelection,
  type ProductBehavior,
} from "@/lib/product/product-behavior";

export type PurchasabilityProduct = {
  sku?: string;
  isActive: boolean;
  available: boolean;
  priceMinor: number | null;
  productBehavior: ProductBehavior;
  modifierGroups: Array<{
    type: "quantity" | "radio";
    exactSelectionQuantity?: number | null;
    options: string[];
    isActive?: boolean;
  }>;
};

export type PurchasabilityResult = {
  purchasable: boolean;
  reasons: string[];
};

function hasConfigurableOptions(product: PurchasabilityProduct): boolean {
  if (!usesExactSelection(product.productBehavior)) return true;
  for (const group of product.modifierGroups) {
    if (
      group.type === "quantity" &&
      typeof group.exactSelectionQuantity === "number" &&
      group.exactSelectionQuantity > 0 &&
      group.isActive !== false &&
      Array.isArray(group.options) &&
      group.options.length > 0
    ) {
      return true;
    }
  }
  return false;
}

/** True only when every Safe-Draft / live commerce gate passes. */
export function evaluateProductPurchasability(
  product: PurchasabilityProduct,
): PurchasabilityResult {
  const reasons: string[] = [];
  if (!product.isActive) reasons.push("INACTIVE");
  if (!product.available) reasons.push("UNAVAILABLE");
  if (product.priceMinor === null || product.priceMinor <= 0) {
    reasons.push("PRICE_UNAVAILABLE");
  }
  if (!hasConfigurableOptions(product)) {
    reasons.push("CONFIG_OPTIONS_UNAVAILABLE");
  }
  return { purchasable: reasons.length === 0, reasons };
}

export function isProductPurchasable(product: PurchasabilityProduct): boolean {
  return evaluateProductPurchasability(product).purchasable;
}
