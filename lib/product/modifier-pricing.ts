/**
 * Trusted add-on pricing from product configuration.
 * Only approved `priceMinor` values affect totals — never invent prices.
 */

export type PricedModifierOptionDetail = {
  label: string;
  priceMinor?: number | null;
  isActive?: boolean;
};

export type PricedModifierGroup = {
  id: string;
  options: string[];
  optionDetails?: PricedModifierOptionDetail[];
  isActive?: boolean;
};

export type PricedModifierSelection = {
  label: string;
  quantity?: number;
};

export function getOptionPriceMinor(
  group: PricedModifierGroup,
  label: string,
): number | null {
  const detail = group.optionDetails?.find((entry) => entry.label === label);
  if (!detail) return null;
  if (detail.isActive === false) return null;
  if (
    typeof detail.priceMinor !== "number" ||
    !Number.isFinite(detail.priceMinor) ||
    detail.priceMinor < 0
  ) {
    return null;
  }
  return detail.priceMinor;
}

export function formatOptionPriceLabel(priceMinor: number | null): string {
  if (priceMinor === null) return "฿ —";
  const major = priceMinor / 100;
  return `฿${major.toLocaleString("en-US", {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Sum approved add-on prices for one configured product unit (one box).
 * Options without an approved price contribute 0.
 */
export function sumApprovedAddonPriceMinor(
  groups: PricedModifierGroup[],
  modifiers: PricedModifierSelection[],
): number {
  let total = 0;
  for (const group of groups) {
    if (group.isActive === false) continue;
    const allowed = new Set(group.options);
    for (const modifier of modifiers) {
      if (!allowed.has(modifier.label)) continue;
      const unit = getOptionPriceMinor(group, modifier.label);
      if (unit === null) continue;
      const qty = modifier.quantity ?? 1;
      if (!Number.isInteger(qty) || qty <= 0) continue;
      total += unit * qty;
    }
  }
  return total;
}

/**
 * Trusted unit price for one product configuration:
 * base product price + approved add-ons. Null when base price is unavailable.
 */
export function computeConfiguredUnitPriceMinor(
  productPriceMinor: number | null | undefined,
  groups: PricedModifierGroup[],
  modifiers: PricedModifierSelection[],
): number | null {
  if (
    typeof productPriceMinor !== "number" ||
    !Number.isFinite(productPriceMinor) ||
    productPriceMinor < 0
  ) {
    return null;
  }
  return productPriceMinor + sumApprovedAddonPriceMinor(groups, modifiers);
}
