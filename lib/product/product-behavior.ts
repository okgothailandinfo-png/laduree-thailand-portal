/**
 * Sprint 33B — explicit product ordering behaviors.
 * Selection rules stay on modifier groups; behavior drives which engines apply.
 * Never infer behavior from category names.
 */

export const PRODUCT_BEHAVIORS = [
  "CONFIGURABLE_BOX",
  "FIXED_PACK",
  "SIMPLE_PRODUCT",
  "OPTIONAL_CONFIGURABLE",
] as const;

export type ProductBehavior = (typeof PRODUCT_BEHAVIORS)[number];

/** Behaviors that require exact internal composition selection. */
export function usesExactSelection(behavior: ProductBehavior): boolean {
  return behavior === "CONFIGURABLE_BOX";
}

/**
 * OPTIONAL_CONFIGURABLE is architecture-ready: optional modifier groups may apply,
 * but exact-selection is not forced by behavior. No speculative storefront flow.
 */
export function usesOptionalConfiguration(behavior: ProductBehavior): boolean {
  return behavior === "OPTIONAL_CONFIGURABLE";
}

export function isProductBehavior(value: unknown): value is ProductBehavior {
  return (
    typeof value === "string" &&
    (PRODUCT_BEHAVIORS as readonly string[]).includes(value)
  );
}

export function parseProductBehavior(
  value: unknown,
  fallback: ProductBehavior = "SIMPLE_PRODUCT",
): ProductBehavior {
  return isProductBehavior(value) ? value : fallback;
}

export type ProductBehaviorSnapshot = {
  productBehavior: ProductBehavior;
  packSize: number | null;
  /** Box exact-selection size when behavior uses exact selection; else null. */
  exactSelectionQuantity: number | null;
  deliveryEligible: boolean;
};

export type BehaviorCatalogProduct = {
  productBehavior: ProductBehavior;
  packSize?: number | null;
  deliveryEligible?: boolean;
  modifierGroups: Array<{
    type: "quantity" | "radio";
    exactSelectionQuantity?: number | null;
  }>;
};

export function resolveExactSelectionQuantityForBehavior(
  product: BehaviorCatalogProduct,
): number | null {
  if (!usesExactSelection(product.productBehavior)) return null;
  for (const group of product.modifierGroups) {
    if (
      group.type === "quantity" &&
      typeof group.exactSelectionQuantity === "number" &&
      Number.isInteger(group.exactSelectionQuantity) &&
      group.exactSelectionQuantity > 0
    ) {
      return group.exactSelectionQuantity;
    }
  }
  return null;
}

/** Snapshot fields for OrderItem historical integrity. */
export function snapshotProductBehavior(
  product: BehaviorCatalogProduct,
): ProductBehaviorSnapshot {
  return {
    productBehavior: product.productBehavior,
    packSize:
      typeof product.packSize === "number" &&
      Number.isInteger(product.packSize) &&
      product.packSize > 0
        ? product.packSize
        : null,
    exactSelectionQuantity: resolveExactSelectionQuantityForBehavior(product),
    deliveryEligible: product.deliveryEligible !== false,
  };
}

export function isDeliveryEligibleProduct(
  product: Pick<BehaviorCatalogProduct, "deliveryEligible">,
): boolean {
  return product.deliveryEligible !== false;
}
