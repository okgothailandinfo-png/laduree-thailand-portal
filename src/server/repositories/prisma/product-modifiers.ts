/**
 * Prisma JSON ↔ domain ProductModifierGroup parsing (Sprint 29).
 * Structures must mirror mock/SG catalog shapes — never invent labels or prices.
 */

import type {
  ProductModifierGroup,
  ProductModifierOptionDetail,
} from "@/src/server/models/product";
import type { Prisma } from "@prisma/client";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  return undefined;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function parseOptionDetails(
  value: unknown,
): ProductModifierOptionDetail[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const details = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = asTrimmedString(row.label);
    if (!label) return [];
    const detail: ProductModifierOptionDetail = { label };
    if ("priceMinor" in row) {
      if (row.priceMinor === null) detail.priceMinor = null;
      else if (
        typeof row.priceMinor === "number" &&
        Number.isInteger(row.priceMinor) &&
        row.priceMinor >= 0
      ) {
        detail.priceMinor = row.priceMinor;
      }
    }
    const sortOrder = asOptionalInt(row.sortOrder);
    if (sortOrder !== undefined && sortOrder !== null) {
      detail.sortOrder = sortOrder;
    }
    const isActive = asOptionalBoolean(row.isActive);
    if (isActive !== undefined) detail.isActive = isActive;
    return [detail];
  });
  return details.length ? details : undefined;
}

/**
 * Parse persisted JSON into domain modifier groups.
 * Invalid / incomplete entries are skipped (fail soft) so a corrupt row
 * cannot crash catalog reads — validation still runs on cart/checkout.
 */
export function parseProductModifierGroups(
  value: unknown,
): ProductModifierGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = asTrimmedString(row.id);
    const title = asTrimmedString(row.title);
    const type = row.type === "quantity" || row.type === "radio" ? row.type : null;
    if (!id || !title || !type) return [];
    if (!Array.isArray(row.options)) return [];
    const options = row.options.flatMap((option) => {
      const label = asTrimmedString(option);
      return label ? [label] : [];
    });

    const group: ProductModifierGroup = {
      id,
      title,
      requiredText:
        row.requiredText === null
          ? null
          : (asTrimmedString(row.requiredText) ?? null),
      type,
      options,
    };

    const optionDetails = parseOptionDetails(row.optionDetails);
    if (optionDetails) group.optionDetails = optionDetails;

    const exact = asOptionalInt(row.exactSelectionQuantity);
    if (exact !== undefined) group.exactSelectionQuantity = exact;

    const required = asOptionalBoolean(row.required);
    if (required !== undefined) group.required = required;

    const minSelection = asOptionalInt(row.minSelection);
    if (minSelection !== undefined) group.minSelection = minSelection;

    const maxSelection = asOptionalInt(row.maxSelection);
    if (maxSelection !== undefined) group.maxSelection = maxSelection;

    const sortOrder = asOptionalInt(row.sortOrder);
    if (sortOrder !== undefined && sortOrder !== null) {
      group.sortOrder = sortOrder;
    }

    const isActive = asOptionalBoolean(row.isActive);
    if (isActive !== undefined) group.isActive = isActive;

    const isAcknowledgement = asOptionalBoolean(row.isAcknowledgement);
    if (isAcknowledgement !== undefined) {
      group.isAcknowledgement = isAcknowledgement;
    }

    return [group];
  });
}

export function toModifierGroupsJson(
  groups: ProductModifierGroup[],
): Prisma.InputJsonValue {
  return groups as unknown as Prisma.InputJsonValue;
}
