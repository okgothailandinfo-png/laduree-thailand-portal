/**
 * Sprint 33C — validate and materialize Thailand Product Master → domain catalog.
 * Safe-Draft: Draft / null price / unresolved delivery / missing options stay non-purchasable.
 */

import {
  THAILAND_ALL_ITEMS_CATEGORY,
  THAILAND_CATEGORY_HIERARCHY,
  THAILAND_PRODUCT_MASTER,
  type ThailandProductMasterRow,
} from "@/data/thailand-product-master";
import {
  isProductBehavior,
  type ProductBehavior,
} from "@/lib/product/product-behavior";
import type { Category } from "@/src/server/models/category";
import type {
  Product,
  ProductModifierGroup,
} from "@/src/server/models/product";

const PLACEHOLDER_IMAGE = "/product-placeholder.svg";
const FORBIDDEN_BEHAVIORS = new Set(["FIXED_PRODUCT"]);

export type ThailandImportIssue = {
  sku?: string;
  code: string;
  message: string;
};

export type ThailandImportValidation = {
  ok: boolean;
  issues: ThailandImportIssue[];
  skuCount: number;
};

export type ThailandCatalogBuild = {
  categories: Category[];
  products: Product[];
  validation: ThailandImportValidation;
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isNaLiteral(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "n/a";
}

/** Fail-closed: only explicit true is delivery-eligible. */
export function resolveDeliveryEligible(
  value: boolean | null | undefined,
): boolean {
  return value === true;
}

/**
 * Fail-closed availability for Safe-Draft.
 * Draft / blank / conflict / Unavailable → not available for purchase.
 */
export function resolveAvailable(row: ThailandProductMasterRow): boolean {
  if (row.status !== "Active") return false;
  if (row.availability === "Unavailable") return false;
  if (row.availability === "Available" && row.pickupEligible) return true;
  // Unresolved availability or Draft → unavailable
  return false;
}

export function resolveIsActive(row: ThailandProductMasterRow): boolean {
  return row.status === "Active";
}

/** n/a / blank / invalid → null; never 0 for missing. */
export function resolvePriceMinor(priceThb: number | null): number | null {
  if (priceThb === null || Number.isNaN(priceThb)) return null;
  if (typeof priceThb !== "number") return null;
  if (priceThb <= 0) return null;
  return Math.round(priceThb * 100);
}

export function resolvePriceThb(priceThb: number | null): number | null {
  const minor = resolvePriceMinor(priceThb);
  return minor === null ? null : minor / 100;
}

function assertNoSgd(row: ThailandProductMasterRow, issues: ThailandImportIssue[]) {
  // Master rows must not carry SGD; guard against accidental fields.
  const record = row as ThailandProductMasterRow & { priceSgd?: unknown };
  if (record.priceSgd !== undefined && record.priceSgd !== null) {
    issues.push({
      sku: row.sku,
      code: "SGD_FORBIDDEN",
      message: "SGD pricing must never be imported into Thailand catalog.",
    });
  }
}

export function validateThailandProductMaster(
  rows: ThailandProductMasterRow[] = THAILAND_PRODUCT_MASTER,
): ThailandImportValidation {
  const issues: ThailandImportIssue[] = [];
  const skus = new Set<string>();

  if (rows.length === 0) {
    issues.push({
      code: "EMPTY_MASTER",
      message: "Thailand Product Master has no rows.",
    });
  }

  for (const row of rows) {
    if (!row.sku || !/^LDR\d{3}$/.test(row.sku)) {
      issues.push({
        sku: row.sku,
        code: "SKU_INVALID",
        message: `Invalid SKU format: ${row.sku}`,
      });
    }
    if (skus.has(row.sku)) {
      issues.push({
        sku: row.sku,
        code: "SKU_DUPLICATE",
        message: `Duplicate SKU: ${row.sku}`,
      });
    }
    skus.add(row.sku);

    if (!row.nameEn?.trim()) {
      issues.push({
        sku: row.sku,
        code: "NAME_EN_REQUIRED",
        message: "Product Name EN is required.",
      });
    }

    if (FORBIDDEN_BEHAVIORS.has(String(row.productBehavior))) {
      issues.push({
        sku: row.sku,
        code: "BEHAVIOR_LEGACY",
        message: "FIXED_PRODUCT is not allowed; use Sprint 33B behaviors.",
      });
    }
    if (!isProductBehavior(row.productBehavior)) {
      issues.push({
        sku: row.sku,
        code: "BEHAVIOR_INVALID",
        message: `Unknown productBehavior: ${row.productBehavior}`,
      });
    }

    if (row.priceThb !== null) {
      if (typeof row.priceThb !== "number" || !(row.priceThb > 0)) {
        issues.push({
          sku: row.sku,
          code: "PRICE_INVALID",
          message: "Approved THB price must be a positive number.",
        });
      }
    }

    if (row.productBehavior === "CONFIGURABLE_BOX") {
      if (
        typeof row.exactSelectionQuantity !== "number" ||
        !Number.isInteger(row.exactSelectionQuantity) ||
        row.exactSelectionQuantity <= 0
      ) {
        issues.push({
          sku: row.sku,
          code: "EXACT_SELECTION_REQUIRED",
          message: "CONFIGURABLE_BOX requires exactSelectionQuantity.",
        });
      }
      if (!row.selectionGroup) {
        issues.push({
          sku: row.sku,
          code: "SELECTION_GROUP_REQUIRED",
          message: "CONFIGURABLE_BOX requires selectionGroup.",
        });
      }
      // Missing options is allowed for Safe-Draft architecture import;
      // purchasability stays closed until options are approved.
    }

    if (row.productBehavior === "FIXED_PACK") {
      if (
        typeof row.packSize !== "number" ||
        !Number.isInteger(row.packSize) ||
        row.packSize <= 0
      ) {
        issues.push({
          sku: row.sku,
          code: "PACK_SIZE_REQUIRED",
          message: "FIXED_PACK requires positive integer packSize.",
        });
      }
      if (row.exactSelectionQuantity != null) {
        issues.push({
          sku: row.sku,
          code: "FIXED_PACK_NO_EXACT",
          message: "FIXED_PACK must not define exactSelectionQuantity.",
        });
      }
    }

    if (row.productBehavior === "SIMPLE_PRODUCT") {
      if (row.packSize != null) {
        issues.push({
          sku: row.sku,
          code: "SIMPLE_NO_PACK",
          message: "SIMPLE_PRODUCT packSize must be null.",
        });
      }
      if (row.exactSelectionQuantity != null) {
        issues.push({
          sku: row.sku,
          code: "SIMPLE_NO_EXACT",
          message: "SIMPLE_PRODUCT must not define exactSelectionQuantity.",
        });
      }
    }

    if (isNaLiteral(row.priceThb)) {
      issues.push({
        sku: row.sku,
        code: "PRICE_NA_LITERAL",
        message: "priceThb must be null for n/a, never the string n/a.",
      });
    }

    assertNoSgd(row, issues);

    const knownCategory = THAILAND_CATEGORY_HIERARCHY.some(
      (c) => c.name === row.categoryName,
    );
    if (!knownCategory) {
      issues.push({
        sku: row.sku,
        code: "CATEGORY_UNKNOWN",
        message: `Category not in approved hierarchy: ${row.categoryName}`,
      });
    }
  }

  // Expected full Safe-Draft set
  for (let i = 1; i <= 38; i += 1) {
    const sku = `LDR${String(i).padStart(3, "0")}`;
    if (!skus.has(sku)) {
      issues.push({
        sku,
        code: "SKU_MISSING",
        message: `Expected SKU ${sku} missing from Product Master.`,
      });
    }
  }

  return { ok: issues.length === 0, issues, skuCount: skus.size };
}

function buildModifierGroups(
  row: ThailandProductMasterRow,
): ProductModifierGroup[] {
  if (row.productBehavior !== "CONFIGURABLE_BOX") return [];
  const qty = row.exactSelectionQuantity!;
  const groupId =
    row.selectionGroup === "EUGENIE_FLAVORS"
      ? "eugenie-flavors"
      : "macaron-flavors";
  const title =
    row.selectionGroup === "EUGENIE_FLAVORS"
      ? "Choice of Eugénie chocolates:"
      : "Choice of Macarons:";

  return [
    {
      id: groupId,
      title,
      requiredText: `Please select ${qty}`,
      type: "quantity",
      exactSelectionQuantity: qty,
      required: true,
      minSelection: qty,
      maxSelection: qty,
      sortOrder: 1,
      isActive: true,
      // Empty until owner-approved Thailand option lists exist.
      options: [...row.selectionOptions],
    },
  ];
}

export function masterRowToProduct(
  row: ThailandProductMasterRow,
  categoryId: string,
  sortOrder: number,
): Product {
  const priceMinor = resolvePriceMinor(row.priceThb);
  const priceThb = resolvePriceThb(row.priceThb);
  const isActive = resolveIsActive(row);
  const available = resolveAvailable(row);
  const deliveryEligible = resolveDeliveryEligible(row.deliveryEligible);
  const slug = `${slugify(row.nameEn)}-${row.sku.toLowerCase()}`;

  return {
    id: `prod-${row.sku.toLowerCase()}`,
    slug,
    sku: row.sku,
    title: row.nameEn,
    categoryId,
    description: row.descriptionEn ? [row.descriptionEn] : [],
    allergenLabel: "Allergen Information:",
    allergenText:
      row.allergen ??
      "Kindly refer to the Allergens page (located at the bottom of the site) for more product information.",
    storageLabel: "Storage Information:",
    storageText: "",
    priceThb,
    priceMinor,
    currency: "THB",
    imagePlaceholder: PLACEHOLDER_IMAGE,
    images: [
      {
        id: `img-${row.sku.toLowerCase()}`,
        mediaId: `media-${row.sku.toLowerCase()}`,
        url: PLACEHOLDER_IMAGE,
        altText: row.nameEn,
        sortOrder: 0,
        isPrimary: true,
      },
    ],
    isActive,
    available,
    deliveryEligible,
    productBehavior: row.productBehavior,
    packSize: row.productBehavior === "SIMPLE_PRODUCT" ? null : row.packSize,
    sortOrder,
    modifierGroups: buildModifierGroups(row),
  };
}

export function buildThailandCatalog(
  rows: ThailandProductMasterRow[] = THAILAND_PRODUCT_MASTER,
): ThailandCatalogBuild {
  const validation = validateThailandProductMaster(rows);
  if (!validation.ok) {
    return { categories: [], products: [], validation };
  }

  const categories: Category[] = THAILAND_CATEGORY_HIERARCHY.map((c) => ({
    id: `cat-${c.slug}`,
    name: c.name,
    slug: c.slug,
    description: null,
    sortOrder: c.sortOrder,
    isActive: true,
  }));

  categories.push({
    id: `cat-${THAILAND_ALL_ITEMS_CATEGORY.slug}`,
    name: THAILAND_ALL_ITEMS_CATEGORY.name,
    slug: THAILAND_ALL_ITEMS_CATEGORY.slug,
    description: null,
    sortOrder: THAILAND_ALL_ITEMS_CATEGORY.sortOrder,
    isActive: true,
  });

  const categoryIdByName = new Map(
    THAILAND_CATEGORY_HIERARCHY.map((c) => [c.name, `cat-${c.slug}`]),
  );

  const products: Product[] = rows.map((row, index) => {
    const categoryId = categoryIdByName.get(row.categoryName);
    if (!categoryId) {
      throw new Error(`Missing category id for ${row.categoryName}`);
    }
    return masterRowToProduct(row, categoryId, index + 1);
  });

  return { categories, products, validation };
}

export function assertThailandCatalogReady(
  rows: ThailandProductMasterRow[] = THAILAND_PRODUCT_MASTER,
): ThailandCatalogBuild {
  const catalog = buildThailandCatalog(rows);
  if (!catalog.validation.ok) {
    const detail = catalog.validation.issues
      .slice(0, 8)
      .map((i) => `${i.code}:${i.sku ?? "-"}:${i.message}`)
      .join(" | ");
    throw new Error(`Thailand Product Master validation failed: ${detail}`);
  }
  return catalog;
}

export function isThailandMasterSku(sku: string): boolean {
  return /^LDR\d{3}$/.test(sku);
}

export type { ProductBehavior };
