/**
 * Sprint 35C-1 — Production Product Master import contract.
 * Separate from prisma/seed.ts and from the mock/Safe-Draft materializer.
 * Does not invent Thailand commercial values.
 */

import {
  THAILAND_CATEGORY_HIERARCHY,
  THAILAND_PRODUCT_MASTER,
  type ThailandProductMasterRow,
} from "@/data/thailand-product-master";
import type { ProductBehavior } from "@/lib/product/product-behavior";

export const PRODUCT_MASTER_SKU_MIN = 1;
export const PRODUCT_MASTER_SKU_MAX = 38;
export const PRODUCT_MASTER_EXPECTED_COUNT = 38;
export const PRODUCT_MASTER_SKU_PATTERN = /^LDR\d{3}$/;

export const EXPECTED_PRODUCT_MASTER_SKUS: readonly string[] = Array.from(
  { length: PRODUCT_MASTER_EXPECTED_COUNT },
  (_, index) =>
    `LDR${String(index + PRODUCT_MASTER_SKU_MIN).padStart(3, "0")}`,
);

/** Approved macaron CONFIGURABLE_BOX sizes. Do not invent additional sizes. */
export const MACARON_CONFIGURABLE_BOX_SIZES = [8, 15, 20, 28, 35, 42] as const;

export const EUGENIE_CONFIGURABLE_SKUS = ["LDR013", "LDR014", "LDR015"] as const;

export const EUGENIE_BOX_SIZE_BY_SKU: Readonly<Record<string, number>> = {
  LDR013: 6,
  LDR014: 12,
  LDR015: 18,
};

export const PRODUCT_MASTER_IMPORT_CONFIRM =
  "LOAD_THAILAND_PRODUCT_MASTER_LDR001_LDR038";

export const FORBIDDEN_LIFECYCLE_EVENTS = [
  "postinstall",
  "build",
  "start",
  "db:seed",
  "db:deploy",
  "db:migrate",
  "prisma:generate",
  "prisma:validate",
  "prisma:format",
] as const;

export type ProductMasterStatus = "Draft" | "Active" | "Inactive";
export type ProductMasterAvailability = "Available" | "Unavailable";
export type ProductMasterSelectionGroup =
  | "MACARON_FLAVORS"
  | "EUGENIE_FLAVORS";

export type ProductMasterMediaReference = {
  /** Filename or owner-supplied reference only — never a fabricated URL. */
  fileName: string;
};

export type ProductMasterImportRow = {
  sku: string;
  categoryName: string;
  nameEn: string;
  nameTh: string | null;
  nameThIsNa: boolean;
  descriptionEn: string | null;
  descriptionTh: string | null;
  productBehavior: ProductBehavior;
  /** Major THB units. null = explicit pending. Field must be present. */
  priceThb: number | null;
  currency: "THB";
  packSize: number | null;
  packUnit: string | null;
  exactSelectionQuantity: number | null;
  selectionGroup: ProductMasterSelectionGroup | null;
  selectionOptions: string[];
  pickupEligible: boolean;
  deliveryEligible: boolean | null;
  availability: ProductMasterAvailability | null;
  categorySheetStatus: ProductMasterAvailability | null;
  allergen: string | null;
  status: ProductMasterStatus;
  mediaReferences: ProductMasterMediaReference[];
};

export const REQUIRED_PRODUCT_MASTER_KEYS = [
  "sku",
  "categoryName",
  "nameEn",
  "nameTh",
  "descriptionEn",
  "descriptionTh",
  "productBehavior",
  "priceThb",
  "currency",
  "packSize",
  "packUnit",
  "exactSelectionQuantity",
  "selectionGroup",
  "selectionOptions",
  "pickupEligible",
  "deliveryEligible",
  "availability",
  "status",
] as const;

export const APPROVED_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  THAILAND_CATEGORY_HIERARCHY.map((category) => category.name),
);

export const APPROVED_CATEGORIES = THAILAND_CATEGORY_HIERARCHY;

export type ProductMasterIssue = {
  sku?: string;
  code: string;
  message: string;
  severity: "error" | "pending" | "info";
};

export function isEugenieConfigurableSku(sku: string): boolean {
  return (EUGENIE_CONFIGURABLE_SKUS as readonly string[]).includes(sku);
}

export function isMacaronBoxSize(value: number): boolean {
  return (MACARON_CONFIGURABLE_BOX_SIZES as readonly number[]).includes(value);
}

/**
 * Map the typed Thailand Product Master into the Production import contract.
 * Adds explicit THB currency and empty media references — does not invent prices,
 * options, images, allergens, or availability.
 */
export function fromThailandProductMaster(
  rows: readonly ThailandProductMasterRow[] = THAILAND_PRODUCT_MASTER,
): ProductMasterImportRow[] {
  return rows.map((row) => ({
    sku: row.sku,
    categoryName: row.categoryName,
    nameEn: row.nameEn,
    nameTh: row.nameTh,
    nameThIsNa: row.nameThIsNa,
    descriptionEn: row.descriptionEn,
    descriptionTh: row.descriptionTh,
    productBehavior: row.productBehavior,
    priceThb: row.priceThb,
    currency: "THB",
    packSize: row.packSize,
    packUnit: row.packUnit,
    exactSelectionQuantity: row.exactSelectionQuantity,
    selectionGroup: row.selectionGroup,
    selectionOptions: [...row.selectionOptions],
    pickupEligible: row.pickupEligible,
    deliveryEligible: row.deliveryEligible,
    availability: row.availability,
    categorySheetStatus: row.categorySheetStatus,
    allergen: row.allergen,
    status: row.status,
    mediaReferences: [],
  }));
}
