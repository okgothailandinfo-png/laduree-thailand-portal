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

/** EN message keys prepared for later TH translation (full i18n not yet wired). */
export const EXACT_SELECTION_MESSAGE_KEYS = {
  pleaseSelect: "product.exactSelection.pleaseSelect",
  pleaseSelectNMore: "product.exactSelection.pleaseSelectNMore",
  nOfNSelected: "product.exactSelection.nOfNSelected",
  maximumSelected: "product.exactSelection.maximumSelected",
  incompleteBeforeAdd: "product.exactSelection.incompleteBeforeAdd",
} as const;

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

/**
 * Customer-facing exact-selection progress copy (EN).
 * Before: “Please select 8” · During: “Please select 3 more” · Done: “8 of 8 selected”
 */
export function formatExactSelectionProgress(
  selected: number,
  required: number,
): string {
  if (selected <= 0) return `Please select ${required}`;
  if (selected >= required) return `${required} of ${required} selected`;
  return `Please select ${required - selected} more`;
}

/** @deprecated Prefer formatExactSelectionProgress */
export function formatSelectedOfRequired(selected: number, required: number): string {
  return formatExactSelectionProgress(selected, required);
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
 * Outer product quantity is independent: flavours define one box configuration;
 * quantity N means N identical boxes.
 */
export function validateExactSelectionModifiers(
  groups: ExactSelectionModifierGroup[],
  modifiers: ExactSelectionModifier[],
  productQuantity: number,
): ExactSelectionValidationResult {
  const exactGroups = getExactSelectionGroups(groups);
  if (exactGroups.length === 0) return { ok: true };

  if (
    !Number.isInteger(productQuantity) ||
    productQuantity < 1 ||
    productQuantity > 999
  ) {
    return {
      ok: false,
      code: "QUANTITY",
      message: "Product quantity must be between 1 and 999.",
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
