/**
 * Required / optional modifier group rules (acknowledgements, gifts, etc.).
 * Configuration-driven — not hard-coded to a specific sentence.
 */

export type ModifierRequirementGroup = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
  exactSelectionQuantity?: number | null;
  /** Explicit required flag (CMS). When unset, inferred from requiredText / min / exact. */
  required?: boolean;
  minSelection?: number | null;
  maxSelection?: number | null;
  isActive?: boolean;
  isAcknowledgement?: boolean;
  sortOrder?: number;
};

export type ModifierRequirementSelection = {
  label: string;
  quantity?: number;
};

export const MODIFIER_REQUIREMENT_MESSAGE_KEYS = {
  pleaseSelectN: "product.modifier.pleaseSelectN",
  optional: "product.modifier.optional",
  maxSelection: "product.modifier.maxSelection",
  acknowledgementRequired: "product.modifier.acknowledgementRequired",
} as const;

export function isGroupActive(group: ModifierRequirementGroup): boolean {
  return group.isActive !== false;
}

/**
 * A group is required when explicitly flagged, marked as acknowledgement,
 * configured with minSelection > 0, exact-selection quantity, or requiredText.
 */
export function isRequiredModifierGroup(group: ModifierRequirementGroup): boolean {
  if (!isGroupActive(group)) return false;
  if (group.required === true) return true;
  if (group.isAcknowledgement === true) return true;
  if (
    typeof group.minSelection === "number" &&
    Number.isInteger(group.minSelection) &&
    group.minSelection > 0
  ) {
    return true;
  }
  if (
    typeof group.exactSelectionQuantity === "number" &&
    group.exactSelectionQuantity > 0
  ) {
    return true;
  }
  if (typeof group.requiredText === "string" && group.requiredText.trim()) {
    return true;
  }
  return false;
}

export function getRequiredMinSelection(group: ModifierRequirementGroup): number {
  if (
    typeof group.exactSelectionQuantity === "number" &&
    group.exactSelectionQuantity > 0
  ) {
    return group.exactSelectionQuantity;
  }
  if (
    typeof group.minSelection === "number" &&
    Number.isInteger(group.minSelection) &&
    group.minSelection > 0
  ) {
    return group.minSelection;
  }
  if (isRequiredModifierGroup(group)) {
    return group.type === "radio" ? 1 : 1;
  }
  return 0;
}

export function getMaxSelection(group: ModifierRequirementGroup): number | null {
  if (
    typeof group.exactSelectionQuantity === "number" &&
    group.exactSelectionQuantity > 0
  ) {
    return group.exactSelectionQuantity;
  }
  if (
    typeof group.maxSelection === "number" &&
    Number.isInteger(group.maxSelection) &&
    group.maxSelection > 0
  ) {
    return group.maxSelection;
  }
  if (group.type === "radio" && isRequiredModifierGroup(group)) return 1;
  return null;
}

export function countGroupSelection(
  group: ModifierRequirementGroup,
  modifiers: ModifierRequirementSelection[],
): number {
  const allowed = new Set(group.options);
  if (group.type === "radio") {
    return modifiers.some((modifier) => allowed.has(modifier.label)) ? 1 : 0;
  }
  let total = 0;
  for (const modifier of modifiers) {
    if (!allowed.has(modifier.label)) continue;
    const qty = modifier.quantity ?? 0;
    if (Number.isInteger(qty) && qty > 0) total += qty;
  }
  return total;
}

export type ModifierRequirementValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "REQUIRED_INCOMPLETE" | "MAX_EXCEEDED";
      groupId: string;
      message: string;
    };

export function formatAcknowledgementRequiredMessage(group: ModifierRequirementGroup): string {
  if (group.requiredText?.trim()) return group.requiredText.trim();
  const min = getRequiredMinSelection(group);
  return `Please select ${min}`;
}

/**
 * Validate required non-exact groups (acknowledgements and min-selection rules).
 * Exact-selection groups are validated separately via `validateExactSelectionModifiers`.
 */
export function validateRequiredModifierGroups(
  groups: ModifierRequirementGroup[],
  modifiers: ModifierRequirementSelection[],
): ModifierRequirementValidationResult {
  for (const group of groups) {
    if (!isGroupActive(group)) continue;
    if (
      typeof group.exactSelectionQuantity === "number" &&
      group.exactSelectionQuantity > 0
    ) {
      continue;
    }

    const selected = countGroupSelection(group, modifiers);
    const max = getMaxSelection(group);
    if (max !== null && selected > max) {
      return {
        ok: false,
        code: "MAX_EXCEEDED",
        groupId: group.id,
        message: `You may select at most ${max} for ${group.title}`,
      };
    }

    if (!isRequiredModifierGroup(group)) continue;
    const min = getRequiredMinSelection(group);
    if (selected < min) {
      return {
        ok: false,
        code: "REQUIRED_INCOMPLETE",
        groupId: group.id,
        message: formatAcknowledgementRequiredMessage(group),
      };
    }
  }

  return { ok: true };
}

export function areRequiredModifierGroupsComplete(
  groups: ModifierRequirementGroup[],
  modifiers: ModifierRequirementSelection[],
): boolean {
  return validateRequiredModifierGroups(groups, modifiers).ok;
}

export function formatOptionalHint(maxSelection?: number | null): string {
  if (typeof maxSelection === "number" && maxSelection > 0) {
    return `Optional · Max ${maxSelection}`;
  }
  return "Optional";
}
