/**
 * Exact-selection rules for fixed-size box products (e.g. macaron boxes).
 * Quantity comes from product configuration (`exactSelectionQuantity`), not UI hard-coding.
 */

export type ExactSelectionModifierGroup = {
  id: string;
  type: "quantity" | "radio";
  options: string[];
  /** When set on a quantity group, selected option quantities must total exactly this value. */
  exactSelectionQuantity?: number | null;
};

export type ExactSelectionModifier = {
  label: string;
  quantity?: number;
};

export function isExactSelectionGroup(
  group: ExactSelectionModifierGroup,
): group is ExactSelectionModifierGroup & { exactSelectionQuantity: number } {
  return (
    group.type === "quantity" &&
    typeof group.exactSelectionQuantity === "number" &&
    Number.isInteger(group.exactSelectionQuantity) &&
    group.exactSelectionQuantity > 0
  );
}

export function getExactSelectionGroups<T extends ExactSelectionModifierGroup>(
  groups: T[],
): Array<T & { exactSelectionQuantity: number }> {
  return groups.filter(
    (group): group is T & { exactSelectionQuantity: number } =>
      isExactSelectionGroup(group),
  );
}

export function sumExactSelectionQuantity(
  group: ExactSelectionModifierGroup,
  modifiers: ExactSelectionModifier[],
): number {
  const allowed = new Set(group.options);
  let total = 0;
  for (const modifier of modifiers) {
    if (!allowed.has(modifier.label)) continue;
    const qty = modifier.quantity ?? 0;
    if (Number.isInteger(qty) && qty > 0) total += qty;
  }
  return total;
}

export function sumExactSelectionFromQtyMap(
  group: ExactSelectionModifierGroup,
  qtyByOptionKey: Record<string, number>,
): number {
  let total = 0;
  for (const option of group.options) {
    const key = `${group.id}:${option}`;
    const qty = qtyByOptionKey[key] ?? 0;
    if (Number.isInteger(qty) && qty > 0) total += qty;
  }
  return total;
}

export function formatSelectedOfRequired(selected: number, required: number): string {
  return `Selected ${selected} of ${required}`;
}

export function formatExactSelectionMaximumMessage(required: number): string {
  return `You have selected the maximum of ${required} macarons.`;
}

export function formatExactSelectionIncompleteMessage(required: number): string {
  return `Please select all ${required} macarons before adding this box to your cart.`;
}

export type ExactSelectionValidationResult =
  | { ok: true }
  | { ok: false; code: "INCOMPLETE" | "EXCEEDED" | "QUANTITY"; message: string };

/**
 * Validate cart/order modifiers against configured exact-selection groups.
 * Also requires product line quantity = 1 when any exact-selection group exists.
 */
export function validateExactSelectionModifiers(
  groups: ExactSelectionModifierGroup[],
  modifiers: ExactSelectionModifier[],
  productQuantity: number,
): ExactSelectionValidationResult {
  const exactGroups = getExactSelectionGroups(groups);
  if (exactGroups.length === 0) return { ok: true };

  if (productQuantity !== 1) {
    return {
      ok: false,
      code: "QUANTITY",
      message:
        "Fixed-size box products must be added with quantity 1. Adjust flavour selections instead.",
    };
  }

  for (const group of exactGroups) {
    const total = sumExactSelectionQuantity(group, modifiers);
    if (total > group.exactSelectionQuantity) {
      return {
        ok: false,
        code: "EXCEEDED",
        message: formatExactSelectionMaximumMessage(group.exactSelectionQuantity),
      };
    }
    if (total !== group.exactSelectionQuantity) {
      return {
        ok: false,
        code: "INCOMPLETE",
        message: formatExactSelectionIncompleteMessage(
          group.exactSelectionQuantity,
        ),
      };
    }
  }

  return { ok: true };
}
