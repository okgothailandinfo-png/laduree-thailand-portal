/**
 * Build cart/order modifiers that satisfy product exact-selection + acknowledgements.
 * Used by smoke fixtures — derives selections from product.modifierGroups only.
 */

import type { ProductModifierGroup } from "@/src/server/models/product";

export type SmokeOrderModifier = {
  label: string;
  quantity?: number;
};

type ProductWithModifiers = {
  modifierGroups: ProductModifierGroup[];
};

function activeGroups(product: ProductWithModifiers): ProductModifierGroup[] {
  return (product.modifierGroups ?? []).filter(
    (group) => group.isActive !== false,
  );
}

/**
 * For quantity exact-selection groups: distribute total across leading options.
 * For required acknowledgements / radios: select the first option.
 */
export function buildValidModifiersForProduct(
  product: ProductWithModifiers,
): SmokeOrderModifier[] {
  const modifiers: SmokeOrderModifier[] = [];

  for (const group of activeGroups(product)) {
    if (
      group.type === "quantity" &&
      typeof group.exactSelectionQuantity === "number" &&
      group.exactSelectionQuantity > 0 &&
      group.options.length > 0
    ) {
      const total = group.exactSelectionQuantity;
      const optionCount = Math.min(group.options.length, total);
      const base = Math.floor(total / optionCount);
      let remainder = total - base * optionCount;
      for (let i = 0; i < optionCount; i += 1) {
        const quantity = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        if (quantity > 0) {
          modifiers.push({ label: group.options[i]!, quantity });
        }
      }
      continue;
    }

    if (
      (group.required === true || group.isAcknowledgement === true) &&
      group.options[0]
    ) {
      modifiers.push({
        label: group.options[0],
        quantity: group.type === "quantity" ? 1 : undefined,
      });
    }
  }

  return modifiers;
}
