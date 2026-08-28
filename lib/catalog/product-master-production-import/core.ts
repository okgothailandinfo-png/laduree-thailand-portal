/**
 * Sprint 35C-1 — Production Product Master validate / dry-run / execute.
 * Insert-only. No silent upsert. No Singapore commercial defaults.
 * Callers must inject a writer; dry-run never opens a database connection.
 */

import {
  APPROVED_CATEGORIES,
  APPROVED_CATEGORY_NAMES,
  EUGENIE_BOX_SIZE_BY_SKU,
  EXPECTED_PRODUCT_MASTER_SKUS,
  FORBIDDEN_LIFECYCLE_EVENTS,
  PRODUCT_MASTER_EXPECTED_COUNT,
  PRODUCT_MASTER_IMPORT_CONFIRM,
  PRODUCT_MASTER_SKU_PATTERN,
  REQUIRED_PRODUCT_MASTER_KEYS,
  fromThailandProductMaster,
  isEugenieConfigurableSku,
  isMacaronBoxSize,
  type ProductMasterImportRow,
  type ProductMasterIssue,
} from "@/lib/catalog/product-master-production-import/contract";
import { isProductBehavior } from "@/lib/product/product-behavior";
import type { ProductModifierGroup } from "@/src/server/models/product";

const FORBIDDEN_BEHAVIORS = new Set(["FIXED_PRODUCT"]);
const CONTENT_PENDING = "[CONTENT PENDING APPROVAL]";
const KNOWN_PACK_UNITS = new Set(["PCS", "G", "SACHET"]);

export type ProductMasterValidation = {
  ok: boolean;
  commerciallyComplete: boolean;
  skuCount: number;
  issues: ProductMasterIssue[];
};

export type PlannedCategory = {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: true;
  description: null;
};

export type PlannedProduct = {
  sku: string;
  slug: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  description: string[];
  productBehavior: ProductMasterImportRow["productBehavior"];
  packSize: number | null;
  packUnitDropped: string | null;
  exactSelectionQuantity: number | null;
  priceMinor: number | null;
  currency: "THB";
  isActive: boolean;
  available: boolean;
  deliveryEligible: boolean;
  allergenLabel: null;
  allergenText: string | null;
  storageLabel: null;
  storageText: null;
  modifierGroups: ProductModifierGroup[];
  mediaReferences: ProductMasterImportRow["mediaReferences"];
  sortOrder: number;
};

export type ProductMasterPlan = {
  validation: ProductMasterValidation;
  categoriesToInsert: PlannedCategory[];
  productsToInsert: PlannedProduct[];
  productsToUpdate: [];
  mediaToInsert: [];
  productImagesToInsert: [];
  assumedEmptyCatalog: true;
};

export type CatalogCategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export type CatalogTx = {
  findCategoryBySlug(slug: string): Promise<CatalogCategoryRow | null>;
  createCategory(input: PlannedCategory): Promise<CatalogCategoryRow>;
  findExistingSkus(skus: string[]): Promise<string[]>;
  createProduct(
    input: PlannedProduct,
    categoryId: string,
  ): Promise<{ id: string; sku: string }>;
};

export type CatalogWriter = {
  transaction<T>(fn: (tx: CatalogTx) => Promise<T>): Promise<T>;
};

export type WriteGuardInput = {
  execute: boolean;
  confirm: string | undefined;
  lifecycleEvent?: string;
  vercel?: string;
};

export type ExecuteOptions = {
  execute: boolean;
  confirm?: string;
  allowPendingCommercial?: boolean;
  writer?: CatalogWriter;
  lifecycleEvent?: string;
  vercel?: string;
};

export type ExecuteResult = {
  dryRun: boolean;
  wrote: boolean;
  insertedCategoryCount: number;
  insertedProductCount: number;
  updatedProductCount: 0;
  rolledBack: boolean;
  errorMessage?: string;
  plan: ProductMasterPlan;
};

function issue(
  severity: ProductMasterIssue["severity"],
  code: string,
  message: string,
  sku?: string,
): ProductMasterIssue {
  return { severity, code, message, sku };
}

function hasOwn(row: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function containsPendingPlaceholder(value: string | null): boolean {
  return typeof value === "string" && value.includes(CONTENT_PENDING);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveIsActive(row: ProductMasterImportRow): boolean {
  return row.status === "Active";
}

function resolveAvailable(row: ProductMasterImportRow): boolean {
  if (row.status !== "Active") return false;
  if (row.availability === "Unavailable") return false;
  if (row.availability === "Available" && row.pickupEligible) return true;
  return false;
}

function resolveDeliveryEligible(value: boolean | null): boolean {
  return value === true;
}

function resolvePriceMinor(priceThb: number | null): number | null {
  if (priceThb === null) return null;
  if (typeof priceThb !== "number" || Number.isNaN(priceThb) || priceThb <= 0) {
    return null;
  }
  return Math.round(priceThb * 100);
}

function architectureModifierGroups(
  row: ProductMasterImportRow,
): ProductModifierGroup[] {
  if (row.productBehavior !== "CONFIGURABLE_BOX") return [];
  const qty = row.exactSelectionQuantity;
  if (typeof qty !== "number") return [];
  const isEugenie = row.selectionGroup === "EUGENIE_FLAVORS";
  return [
    {
      id: isEugenie ? "eugenie-flavors" : "macaron-flavors",
      title: isEugenie
        ? "Choice of Eugénie chocolates:"
        : "Choice of Macarons:",
      requiredText: `Please select ${qty}`,
      type: "quantity",
      exactSelectionQuantity: qty,
      required: true,
      minSelection: qty,
      maxSelection: qty,
      sortOrder: 1,
      isActive: true,
      options: [...row.selectionOptions],
    },
  ];
}

export function validateProductMasterImport(
  rows: ProductMasterImportRow[],
): ProductMasterValidation {
  const issues: ProductMasterIssue[] = [];
  const skus = new Set<string>();

  if (rows.length === 0) {
    issues.push(issue("error", "EMPTY_MASTER", "Product Master has no rows."));
  }

  for (const row of rows) {
    for (const key of REQUIRED_PRODUCT_MASTER_KEYS) {
      if (!hasOwn(row, key)) {
        issues.push(
          issue(
            "error",
            "REQUIRED_FIELD_MISSING",
            `Required field missing: ${key}`,
            row.sku,
          ),
        );
      }
    }

    if (!row.sku || !PRODUCT_MASTER_SKU_PATTERN.test(row.sku)) {
      issues.push(
        issue(
          "error",
          "SKU_MALFORMED",
          `Malformed SKU: ${row.sku ?? "(empty)"}`,
          row.sku,
        ),
      );
    }
    if (skus.has(row.sku)) {
      issues.push(
        issue("error", "SKU_DUPLICATE", `Duplicate SKU: ${row.sku}`, row.sku),
      );
    }
    skus.add(row.sku);

    if (!row.nameEn?.trim()) {
      issues.push(
        issue("error", "NAME_EN_REQUIRED", "Product Name EN is required.", row.sku),
      );
    }
    if (!row.descriptionEn?.trim()) {
      issues.push(
        issue(
          "error",
          "DESCRIPTION_EN_REQUIRED",
          "Description EN is required.",
          row.sku,
        ),
      );
    }
    if (containsPendingPlaceholder(row.nameEn) || containsPendingPlaceholder(row.descriptionEn)) {
      issues.push(
        issue(
          "error",
          "PENDING_PLACEHOLDER_NOT_APPROVED",
          "CONTENT PENDING APPROVAL must not be imported as approved copy.",
          row.sku,
        ),
      );
    }
    if (row.nameTh != null && row.nameTh.trim() !== "") {
      issues.push(
        issue(
          "error",
          "NAME_TH_SCHEMA_INCOMPATIBLE",
          "nameTh cannot be persisted; Product has no Thai name column.",
          row.sku,
        ),
      );
    }
    if (row.descriptionTh != null && row.descriptionTh.trim() !== "") {
      issues.push(
        issue(
          "error",
          "DESCRIPTION_TH_SCHEMA_INCOMPATIBLE",
          "descriptionTh cannot be persisted; Product has no Thai description column.",
          row.sku,
        ),
      );
    }

    if (!APPROVED_CATEGORY_NAMES.has(row.categoryName)) {
      issues.push(
        issue(
          "error",
          "CATEGORY_UNKNOWN",
          `Category not in approved hierarchy: ${row.categoryName}`,
          row.sku,
        ),
      );
    }

    if (FORBIDDEN_BEHAVIORS.has(String(row.productBehavior))) {
      issues.push(
        issue(
          "error",
          "BEHAVIOR_LEGACY",
          "FIXED_PRODUCT is not allowed; LDR013–LDR015 must remain CONFIGURABLE_BOX.",
          row.sku,
        ),
      );
    }
    if (!isProductBehavior(row.productBehavior)) {
      issues.push(
        issue(
          "error",
          "BEHAVIOR_INVALID",
          `Unknown productBehavior: ${String(row.productBehavior)}`,
          row.sku,
        ),
      );
    }
    if (row.productBehavior === "OPTIONAL_CONFIGURABLE") {
      issues.push(
        issue(
          "error",
          "BEHAVIOR_NOT_IN_MASTER",
          "OPTIONAL_CONFIGURABLE is not part of the LDR001–LDR038 Product Master.",
          row.sku,
        ),
      );
    }

    if (isEugenieConfigurableSku(row.sku)) {
      if (row.productBehavior !== "CONFIGURABLE_BOX") {
        issues.push(
          issue(
            "error",
            "EUGENIE_MUST_BE_CONFIGURABLE_BOX",
            `${row.sku} must be CONFIGURABLE_BOX (not FIXED_PRODUCT / FIXED_PACK).`,
            row.sku,
          ),
        );
      }
      if (row.selectionGroup !== "EUGENIE_FLAVORS") {
        issues.push(
          issue(
            "error",
            "EUGENIE_SELECTION_GROUP",
            `${row.sku} requires selectionGroup EUGENIE_FLAVORS.`,
            row.sku,
          ),
        );
      }
      const expectedSize = EUGENIE_BOX_SIZE_BY_SKU[row.sku];
      if (row.exactSelectionQuantity !== expectedSize || row.packSize !== expectedSize) {
        issues.push(
          issue(
            "error",
            "EUGENIE_SELECTION_QUANTITY",
            `${row.sku} requires exactSelectionQuantity and packSize ${expectedSize}.`,
            row.sku,
          ),
        );
      }
    }

    if (row.currency !== "THB") {
      issues.push(
        issue(
          "error",
          "CURRENCY_NOT_THB",
          "Thailand Product Master currency must be THB.",
          row.sku,
        ),
      );
    }
    const record = row as ProductMasterImportRow & { priceSgd?: unknown };
    if (record.priceSgd !== undefined && record.priceSgd !== null) {
      issues.push(
        issue(
          "error",
          "SGD_FORBIDDEN",
          "SGD pricing must never be imported into Thailand catalog.",
          row.sku,
        ),
      );
    }

    if (row.priceThb !== null) {
      if (typeof row.priceThb !== "number" || !(row.priceThb > 0)) {
        issues.push(
          issue(
            "error",
            "PRICE_INVALID",
            "Approved THB price must be a positive number (never 0).",
            row.sku,
          ),
        );
      }
    } else {
      issues.push(
        issue(
          "pending",
          "PRICE_PENDING",
          "Thailand retail price is not approved (null). Will not invent 0, 1, or SGD.",
          row.sku,
        ),
      );
    }

    if (row.productBehavior === "CONFIGURABLE_BOX") {
      if (
        typeof row.exactSelectionQuantity !== "number" ||
        !Number.isInteger(row.exactSelectionQuantity) ||
        row.exactSelectionQuantity <= 0
      ) {
        issues.push(
          issue(
            "error",
            "EXACT_SELECTION_REQUIRED",
            "CONFIGURABLE_BOX requires a positive integer exactSelectionQuantity.",
            row.sku,
          ),
        );
      }
      if (!row.selectionGroup) {
        issues.push(
          issue(
            "error",
            "SELECTION_GROUP_REQUIRED",
            "CONFIGURABLE_BOX requires selectionGroup.",
            row.sku,
          ),
        );
      }
      if (
        row.selectionGroup === "MACARON_FLAVORS" &&
        typeof row.exactSelectionQuantity === "number" &&
        !isMacaronBoxSize(row.exactSelectionQuantity)
      ) {
        issues.push(
          issue(
            "error",
            "MACARON_BOX_SIZE_INVALID",
            `Macaron CONFIGURABLE_BOX size ${row.exactSelectionQuantity} is not in approved set 8/15/20/28/35/42.`,
            row.sku,
          ),
        );
      }
      if (
        typeof row.packSize === "number" &&
        typeof row.exactSelectionQuantity === "number" &&
        row.packSize !== row.exactSelectionQuantity
      ) {
        issues.push(
          issue(
            "error",
            "PACK_SIZE_SELECTION_MISMATCH",
            "CONFIGURABLE_BOX packSize must equal exactSelectionQuantity.",
            row.sku,
          ),
        );
      }
      if (!Array.isArray(row.selectionOptions)) {
        issues.push(
          issue(
            "error",
            "MODIFIER_OPTIONS_INVALID",
            "selectionOptions must be an array.",
            row.sku,
          ),
        );
      } else if (row.selectionOptions.length === 0) {
        issues.push(
          issue(
            "pending",
            "OPTIONS_PENDING",
            "CONFIGURABLE_BOX flavor options are empty until owner-approved lists exist.",
            row.sku,
          ),
        );
      }
    }

    if (row.productBehavior === "FIXED_PACK") {
      if (
        typeof row.packSize !== "number" ||
        !Number.isInteger(row.packSize) ||
        row.packSize <= 0
      ) {
        issues.push(
          issue(
            "error",
            "PACK_SIZE_REQUIRED",
            "FIXED_PACK requires positive integer packSize.",
            row.sku,
          ),
        );
      }
      if (row.exactSelectionQuantity != null) {
        issues.push(
          issue(
            "error",
            "FIXED_PACK_NO_EXACT",
            "FIXED_PACK must not define exactSelectionQuantity.",
            row.sku,
          ),
        );
      }
      if (row.selectionGroup != null || row.selectionOptions.length > 0) {
        issues.push(
          issue(
            "error",
            "FIXED_PACK_NO_MODIFIERS",
            "FIXED_PACK must not define selectionGroup or selectionOptions.",
            row.sku,
          ),
        );
      }
    }

    if (row.productBehavior === "SIMPLE_PRODUCT") {
      if (row.packSize != null) {
        issues.push(
          issue(
            "error",
            "SIMPLE_NO_PACK",
            "SIMPLE_PRODUCT packSize must be null.",
            row.sku,
          ),
        );
      }
      if (row.exactSelectionQuantity != null) {
        issues.push(
          issue(
            "error",
            "SIMPLE_NO_EXACT",
            "SIMPLE_PRODUCT must not define exactSelectionQuantity.",
            row.sku,
          ),
        );
      }
      if (row.selectionGroup != null || row.selectionOptions.length > 0) {
        issues.push(
          issue(
            "error",
            "SIMPLE_NO_MODIFIERS",
            "SIMPLE_PRODUCT must not define selectionGroup or selectionOptions.",
            row.sku,
          ),
        );
      }
    }

    if (row.packUnit != null && !KNOWN_PACK_UNITS.has(row.packUnit)) {
      issues.push(
        issue(
          "error",
          "PACK_UNIT_UNKNOWN",
          `Unknown packUnit ${row.packUnit}; will not invent a unit.`,
          row.sku,
        ),
      );
    }
    if (row.packUnit != null) {
      issues.push(
        issue(
          "info",
          "PACK_UNIT_NOT_PERSISTED",
          "packUnit is not a Prisma column and will not be stored.",
          row.sku,
        ),
      );
    }

    if (row.status === "Draft") {
      issues.push(
        issue(
          "pending",
          "STATUS_DRAFT",
          "Status Draft — Product.isActive will be false.",
          row.sku,
        ),
      );
    }
    if (row.availability == null) {
      issues.push(
        issue(
          "pending",
          "AVAILABILITY_UNRESOLVED",
          "Availability unresolved — Product.available will be false (not invented).",
          row.sku,
        ),
      );
    }
    if (row.deliveryEligible == null) {
      issues.push(
        issue(
          "pending",
          "DELIVERY_UNRESOLVED",
          "Delivery eligibility unresolved — stored as false (fail-closed, not invented true).",
          row.sku,
        ),
      );
    }
    if (row.allergen == null || !row.allergen.trim()) {
      issues.push(
        issue(
          "pending",
          "ALLERGEN_PENDING",
          "Allergen text is not approved — will store null (will not copy Singapore wording).",
          row.sku,
        ),
      );
    }
    if (!row.mediaReferences || row.mediaReferences.length === 0) {
      issues.push(
        issue(
          "pending",
          "MEDIA_PENDING",
          "No media references — ProductImage will not be created; no placeholder URL.",
          row.sku,
        ),
      );
    } else {
      for (const ref of row.mediaReferences) {
        if (!ref.fileName?.trim()) {
          issues.push(
            issue(
              "error",
              "MEDIA_REFERENCE_INVALID",
              "Media reference fileName is empty.",
              row.sku,
            ),
          );
        }
        if (/^https?:\/\//i.test(ref.fileName) || ref.fileName.startsWith("/")) {
          issues.push(
            issue(
              "error",
              "MEDIA_URL_FABRICATED",
              "Media references must be filenames, not URLs.",
              row.sku,
            ),
          );
        }
      }
    }

    if (row.categorySheetStatus === "Unavailable") {
      issues.push(
        issue(
          "info",
          "CATEGORY_SHEET_STATUS_UNMAPPED",
          "categorySheetStatus is not a Prisma field; importer does not map it.",
          row.sku,
        ),
      );
    }
  }

  for (const sku of EXPECTED_PRODUCT_MASTER_SKUS) {
    if (!skus.has(sku)) {
      issues.push(
        issue("error", "SKU_MISSING", `Expected SKU ${sku} is missing.`, sku),
      );
    }
  }
  for (const sku of skus) {
    if (
      PRODUCT_MASTER_SKU_PATTERN.test(sku) &&
      !EXPECTED_PRODUCT_MASTER_SKUS.includes(sku)
    ) {
      issues.push(
        issue("error", "SKU_UNEXPECTED", `Unexpected SKU ${sku}.`, sku),
      );
    }
  }
  if (skus.size !== PRODUCT_MASTER_EXPECTED_COUNT && rows.length !== 0) {
    issues.push(
      issue(
        "error",
        "SKU_COUNT",
        `Expected ${PRODUCT_MASTER_EXPECTED_COUNT} SKUs, found ${skus.size}.`,
      ),
    );
  }

  const errors = issues.filter((item) => item.severity === "error");
  const pending = issues.filter((item) => item.severity === "pending");
  return {
    ok: errors.length === 0,
    commerciallyComplete: errors.length === 0 && pending.length === 0,
    skuCount: skus.size,
    issues,
  };
}

export function buildProductMasterPlan(
  rows: ProductMasterImportRow[] = fromThailandProductMaster(),
): ProductMasterPlan {
  const validation = validateProductMasterImport(rows);
  if (!validation.ok) {
    return {
      validation,
      categoriesToInsert: [],
      productsToInsert: [],
      productsToUpdate: [],
      mediaToInsert: [],
      productImagesToInsert: [],
      assumedEmptyCatalog: true,
    };
  }

  const usedNames = new Set(rows.map((row) => row.categoryName));
  const categoriesToInsert: PlannedCategory[] = APPROVED_CATEGORIES.filter(
    (category) => usedNames.has(category.name),
  ).map((category) => ({
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    isActive: true,
    description: null,
  }));

  const categorySlugByName = new Map(
    APPROVED_CATEGORIES.map((category) => [category.name, category.slug]),
  );

  const productsToInsert: PlannedProduct[] = rows.map((row, index) => ({
    sku: row.sku,
    slug: `${slugify(row.nameEn)}-${row.sku.toLowerCase()}`,
    title: row.nameEn,
    categoryName: row.categoryName,
    categorySlug: categorySlugByName.get(row.categoryName) ?? "",
    description: row.descriptionEn ? [row.descriptionEn] : [],
    productBehavior: row.productBehavior,
    packSize: row.productBehavior === "SIMPLE_PRODUCT" ? null : row.packSize,
    packUnitDropped: row.packUnit,
    exactSelectionQuantity:
      row.productBehavior === "CONFIGURABLE_BOX"
        ? row.exactSelectionQuantity
        : null,
    priceMinor: resolvePriceMinor(row.priceThb),
    currency: "THB",
    isActive: resolveIsActive(row),
    available: resolveAvailable(row),
    deliveryEligible: resolveDeliveryEligible(row.deliveryEligible),
    allergenLabel: null,
    allergenText: row.allergen?.trim() ? row.allergen.trim() : null,
    storageLabel: null,
    storageText: null,
    modifierGroups: architectureModifierGroups(row),
    mediaReferences: [...row.mediaReferences],
    sortOrder: index + 1,
  }));

  return {
    validation,
    categoriesToInsert,
    productsToInsert,
    productsToUpdate: [],
    mediaToInsert: [],
    productImagesToInsert: [],
    assumedEmptyCatalog: true,
  };
}

export function parseProductMasterCliMode(
  argv: string[],
): "validate" | "dry-run" | "execute" {
  const command = argv[0];
  const rest = argv.slice(1);
  const wantsExecute = rest.includes("--execute");
  const wantsDryRun = rest.includes("--dry-run");
  if (command === "validate") return "validate";
  if (command === "import" && wantsExecute && !wantsDryRun) return "execute";
  return "dry-run";
}

export function assertWriteAllowed(input: WriteGuardInput): void {
  if (!input.execute) {
    throw new Error(
      "Product Master write refused: execute=false (dry-run only).",
    );
  }
  const lifecycle = input.lifecycleEvent?.trim();
  if (
    lifecycle &&
    (FORBIDDEN_LIFECYCLE_EVENTS as readonly string[]).includes(lifecycle)
  ) {
    throw new Error(
      `Product Master write refused: cannot run during npm lifecycle "${lifecycle}".`,
    );
  }
  if (input.vercel === "1") {
    throw new Error(
      "Product Master write refused: Vercel build/deploy must not import catalog.",
    );
  }
  if (input.confirm !== PRODUCT_MASTER_IMPORT_CONFIRM) {
    throw new Error(
      "Product Master write refused: PRODUCT_MASTER_IMPORT_CONFIRM is missing or does not match the required opt-in token.",
    );
  }
}

export function dryRunProductMasterImport(
  rows: ProductMasterImportRow[] = fromThailandProductMaster(),
): ExecuteResult {
  const plan = buildProductMasterPlan(rows);
  return {
    dryRun: true,
    wrote: false,
    insertedCategoryCount: plan.categoriesToInsert.length,
    insertedProductCount: plan.productsToInsert.length,
    updatedProductCount: 0,
    rolledBack: false,
    plan,
  };
}

export async function executeProductMasterImport(
  rows: ProductMasterImportRow[],
  options: ExecuteOptions,
): Promise<ExecuteResult> {
  const plan = buildProductMasterPlan(rows);

  if (!options.execute) {
    return dryRunProductMasterImport(rows);
  }

  assertWriteAllowed({
    execute: true,
    confirm: options.confirm,
    lifecycleEvent: options.lifecycleEvent,
    vercel: options.vercel,
  });

  if (!plan.validation.ok) {
    throw new Error("Product Master write refused: validation errors present.");
  }
  if (!options.allowPendingCommercial && !plan.validation.commerciallyComplete) {
    throw new Error(
      "Product Master write refused: commercial data is pending (prices, options, media, status, availability, delivery, or allergens).",
    );
  }
  if (!options.writer) {
    throw new Error("Product Master write refused: no catalog writer supplied.");
  }

  try {
    const counts = await options.writer.transaction(async (tx) => {
      const existing = await tx.findExistingSkus(
        plan.productsToInsert.map((product) => product.sku),
      );
      if (existing.length > 0) {
        throw new Error(
          `Insert-only import refused: SKU already exists (${existing.sort().join(", ")}).`,
        );
      }

      const categoryIdBySlug = new Map<string, string>();
      let insertedCategories = 0;
      for (const category of plan.categoriesToInsert) {
        const found = await tx.findCategoryBySlug(category.slug);
        if (found) {
          if (found.name !== category.name) {
            throw new Error(
              `Category slug ${category.slug} exists with a different name; refusing overwrite.`,
            );
          }
          categoryIdBySlug.set(category.slug, found.id);
          continue;
        }
        const created = await tx.createCategory(category);
        categoryIdBySlug.set(category.slug, created.id);
        insertedCategories += 1;
      }

      let insertedProducts = 0;
      for (const product of plan.productsToInsert) {
        const categoryId = categoryIdBySlug.get(product.categorySlug);
        if (!categoryId) {
          throw new Error(`Missing category id for ${product.sku}`);
        }
        await tx.createProduct(product, categoryId);
        insertedProducts += 1;
      }

      return {
        insertedCategoryCount: insertedCategories,
        insertedProductCount: insertedProducts,
      };
    });

    return {
      dryRun: false,
      wrote: true,
      insertedCategoryCount: counts.insertedCategoryCount,
      insertedProductCount: counts.insertedProductCount,
      updatedProductCount: 0,
      rolledBack: false,
      plan,
    };
  } catch (error) {
    return {
      dryRun: false,
      wrote: false,
      insertedCategoryCount: 0,
      insertedProductCount: 0,
      updatedProductCount: 0,
      rolledBack: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      plan,
    };
  }
}

export function formatProductMasterReport(result: ExecuteResult): string {
  const errors = result.plan.validation.issues.filter((item) => item.severity === "error");
  const pending = result.plan.validation.issues.filter(
    (item) => item.severity === "pending",
  );
  const lines = [
    "SPRINT 35C-1 PRODUCT MASTER IMPORT",
    `Mode: ${result.dryRun ? "dry-run" : "execute"}`,
    `Wrote: ${result.wrote ? "YES" : "NO"}`,
    `Rolled back: ${result.rolledBack ? "YES" : "NO"}`,
    `SKU count: ${result.plan.validation.skuCount}`,
    `Structural validation: ${result.plan.validation.ok ? "PASS" : "FAIL"}`,
    `Commercially complete: ${result.plan.validation.commerciallyComplete ? "YES" : "NO"}`,
    `Intended category inserts: ${result.plan.categoriesToInsert.length}`,
    `Intended product inserts: ${result.plan.productsToInsert.length}`,
    `Intended product updates: 0 (insert-only)`,
    `Intended media inserts: 0 (no image upload this sprint)`,
    `Idempotency: insert-only; existing SKUs abort the transaction`,
  ];
  if (errors.length) {
    lines.push("Errors:");
    for (const item of errors.slice(0, 40)) {
      lines.push(`  [${item.code}] ${item.sku ?? "-"} ${item.message}`);
    }
  }
  if (pending.length) {
    lines.push("Commercial / pending blockers:");
    const codes = [...new Set(pending.map((item) => item.code))];
    for (const code of codes) {
      const count = pending.filter((item) => item.code === code).length;
      lines.push(`  ${code} x${count}`);
    }
  }
  return lines.join("\n");
}

export { fromThailandProductMaster, PRODUCT_MASTER_IMPORT_CONFIRM };
