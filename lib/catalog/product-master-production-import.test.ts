import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { THAILAND_PRODUCT_MASTER } from "@/data/thailand-product-master";
import {
  EUGENIE_CONFIGURABLE_SKUS,
  MACARON_CONFIGURABLE_BOX_SIZES,
  PRODUCT_MASTER_EXPECTED_COUNT,
  PRODUCT_MASTER_IMPORT_CONFIRM,
  fromThailandProductMaster,
} from "@/lib/catalog/product-master-production-import/contract";
import {
  assertWriteAllowed,
  buildProductMasterPlan,
  dryRunProductMasterImport,
  executeProductMasterImport,
  parseProductMasterCliMode,
  validateProductMasterImport,
  type CatalogTx,
  type CatalogWriter,
} from "@/lib/catalog/product-master-production-import/core";
import type { ProductMasterImportRow } from "@/lib/catalog/product-master-production-import/contract";
import { usesExactSelection } from "@/lib/product/product-behavior";

function cloneRows(): ProductMasterImportRow[] {
  return structuredClone(fromThailandProductMaster());
}

/** In-test commercial fixture only — not Thailand retail data and not a Production source. */
function commerciallyCompleteRows(): ProductMasterImportRow[] {
  return cloneRows().map((row) => ({
    ...row,
    status: "Active",
    availability: "Available",
    pickupEligible: true,
    deliveryEligible: true,
    priceThb: 100,
    allergen: "Test allergen (fixture, not Thailand-approved)",
    mediaReferences: [{ fileName: `${row.sku.toLowerCase()}.jpg` }],
    selectionOptions:
      row.productBehavior === "CONFIGURABLE_BOX"
        ? ["Test Option A", "Test Option B"]
        : [],
  }));
}

type MemoryState = {
  categories: Array<{ id: string; name: string; slug: string }>;
  products: Array<{ sku: string }>;
};

function createMemoryWriter(options?: {
  failOnSku?: string;
  existingSkus?: string[];
}): {
  writer: CatalogWriter;
  state: MemoryState;
  transactionCalls: { count: number };
} {
  const state: MemoryState = { categories: [], products: [] };
  const transactionCalls = { count: 0 };
  let nextId = 1;

  const writer: CatalogWriter = {
    async transaction(fn) {
      transactionCalls.count += 1;
      const stagingCategories = [...state.categories];
      const stagingProducts = [...state.products];
      const tx: CatalogTx = {
        async findCategoryBySlug(slug) {
          return stagingCategories.find((row) => row.slug === slug) ?? null;
        },
        async createCategory(input) {
          const row = {
            id: `cat-${nextId++}`,
            name: input.name,
            slug: input.slug,
          };
          stagingCategories.push(row);
          return row;
        },
        async findExistingSkus(skus) {
          const existing = new Set([
            ...stagingProducts.map((row) => row.sku),
            ...(options?.existingSkus ?? []),
          ]);
          return skus.filter((sku) => existing.has(sku));
        },
        async createProduct(input) {
          if (options?.failOnSku === input.sku) {
            throw new Error(`forced failure ${input.sku}`);
          }
          stagingProducts.push({ sku: input.sku });
          return { id: `prod-${nextId++}`, sku: input.sku };
        },
      };
      const result = await fn(tx);
      state.categories = stagingCategories;
      state.products = stagingProducts;
      return result;
    },
  };

  return { writer, state, transactionCalls };
}

describe("Sprint 35C-1 — Production Product Master importer", () => {
  it("validates the authoritative 38-SKU Product Master structurally", () => {
    const rows = fromThailandProductMaster();
    const validation = validateProductMasterImport(rows);
    assert.equal(rows.length, PRODUCT_MASTER_EXPECTED_COUNT);
    assert.equal(validation.ok, true, JSON.stringify(validation.issues.filter((i) => i.severity === "error")));
    assert.equal(validation.skuCount, 38);
    assert.equal(validation.commerciallyComplete, false);
  });

  it("fails on a missing SKU and does not skip the gap", () => {
    const rows = cloneRows().filter((row) => row.sku !== "LDR010");
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "SKU_MISSING" && item.sku === "LDR010"));
  });

  it("fails on a duplicate SKU", () => {
    const rows = cloneRows();
    rows.push(structuredClone(rows[0]!));
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "SKU_DUPLICATE" && item.sku === "LDR001"));
  });

  it("fails on an unexpected SKU", () => {
    const rows = cloneRows();
    rows[37]!.sku = "LDR039";
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "SKU_UNEXPECTED" && item.sku === "LDR039"));
    assert.ok(validation.issues.some((item) => item.code === "SKU_MISSING" && item.sku === "LDR038"));
  });

  it("fails on a malformed SKU", () => {
    const rows = cloneRows();
    rows[0]!.sku = "ldr1";
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "SKU_MALFORMED"));
  });

  it("fails when a required commercial field is missing", () => {
    const rows = cloneRows();
    rows[0]!.nameEn = "";
    const unnamed = validateProductMasterImport(rows);
    assert.equal(unnamed.ok, false);
    assert.ok(unnamed.issues.some((item) => item.code === "NAME_EN_REQUIRED"));

    const withoutPrice = cloneRows();
    delete (withoutPrice[5] as { priceThb?: number | null }).priceThb;
    const missingPrice = validateProductMasterImport(withoutPrice);
    assert.equal(missingPrice.ok, false);
    assert.ok(
      missingPrice.issues.some(
        (item) => item.code === "REQUIRED_FIELD_MISSING" && item.message.includes("priceThb"),
      ),
    );
  });

  it("rejects invalid / legacy FIXED_PRODUCT behavior", () => {
    const rows = cloneRows();
    (rows[12] as { productBehavior: string }).productBehavior = "FIXED_PRODUCT";
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "BEHAVIOR_LEGACY"));
    assert.ok(
      validation.issues.some(
        (item) => item.code === "EUGENIE_MUST_BE_CONFIGURABLE_BOX" && item.sku === "LDR013",
      ),
    );
  });

  it("guards LDR013–LDR015 as CONFIGURABLE_BOX with Eugénie selection", () => {
    const rows = fromThailandProductMaster();
    for (const sku of EUGENIE_CONFIGURABLE_SKUS) {
      const row = rows.find((item) => item.sku === sku)!;
      assert.equal(row.productBehavior, "CONFIGURABLE_BOX");
      assert.equal(row.selectionGroup, "EUGENIE_FLAVORS");
      assert.equal(usesExactSelection(row.productBehavior), true);
    }
    const validation = validateProductMasterImport(rows);
    assert.equal(
      validation.issues.some((item) => item.code === "EUGENIE_MUST_BE_CONFIGURABLE_BOX"),
      false,
    );
  });

  it("guards macaron configurable-box sizes 8/15/20/28/35/42", () => {
    const rows = fromThailandProductMaster();
    const macaronSizes = rows
      .filter((row) => row.selectionGroup === "MACARON_FLAVORS")
      .map((row) => row.exactSelectionQuantity);
    for (const size of MACARON_CONFIGURABLE_BOX_SIZES) {
      assert.ok(macaronSizes.includes(size), `missing macaron size ${size}`);
    }
    const invalid = cloneRows();
    const ldr003 = invalid.find((row) => row.sku === "LDR003")!;
    ldr003.exactSelectionQuantity = 10;
    ldr003.packSize = 10;
    const validation = validateProductMasterImport(invalid);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "MACARON_BOX_SIZE_INVALID"));
  });

  it("fails invalid selection quantity", () => {
    const rows = cloneRows();
    const box = rows.find((row) => row.sku === "LDR004")!;
    box.exactSelectionQuantity = 0;
    box.packSize = 0;
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "EXACT_SELECTION_REQUIRED"));
  });

  it("fails when category is missing from the approved hierarchy", () => {
    const rows = cloneRows();
    rows[0]!.categoryName = "Merchandise";
    const validation = validateProductMasterImport(rows);
    assert.equal(validation.ok, false);
    assert.ok(validation.issues.some((item) => item.code === "CATEGORY_UNKNOWN"));
  });

  it("fails invalid modifier relationships", () => {
    const configurable = cloneRows();
    const ldr001 = configurable.find((row) => row.sku === "LDR001")!;
    ldr001.selectionGroup = null;
    const missingGroup = validateProductMasterImport(configurable);
    assert.equal(missingGroup.ok, false);
    assert.ok(missingGroup.issues.some((item) => item.code === "SELECTION_GROUP_REQUIRED"));

    const fixed = cloneRows();
    const sable = fixed.find((row) => row.sku === "LDR009")!;
    sable.selectionGroup = "MACARON_FLAVORS";
    sable.selectionOptions = ["Almond"];
    const invalidFixed = validateProductMasterImport(fixed);
    assert.equal(invalidFixed.ok, false);
    assert.ok(invalidFixed.issues.some((item) => item.code === "FIXED_PACK_NO_MODIFIERS"));
  });

  it("classifies explicit null price as pending and never defaults 0, 1, or SGD", () => {
    const rows = fromThailandProductMaster();
    const validation = validateProductMasterImport(rows);
    assert.equal(
      validation.issues.filter((item) => item.code === "PRICE_PENDING").length,
      38,
    );
    const plan = buildProductMasterPlan(rows);
    for (const product of plan.productsToInsert) {
      assert.equal(product.priceMinor, null);
      assert.notEqual(product.priceMinor, 0);
      assert.equal(product.currency, "THB");
    }
    const sgd = cloneRows();
    (sgd[0] as ProductMasterImportRow & { priceSgd: number }).priceSgd = 48;
    const sgdValidation = validateProductMasterImport(sgd);
    assert.ok(sgdValidation.issues.some((item) => item.code === "SGD_FORBIDDEN"));
  });

  it("dry-run performs zero writes", async () => {
    const memory = createMemoryWriter();
    const dry = dryRunProductMasterImport(fromThailandProductMaster());
    assert.equal(dry.dryRun, true);
    assert.equal(dry.wrote, false);
    assert.equal(memory.transactionCalls.count, 0);
    assert.equal(memory.state.products.length, 0);

    const executedAsDry = await executeProductMasterImport(
      fromThailandProductMaster(),
      { execute: false, writer: memory.writer },
    );
    assert.equal(executedAsDry.wrote, false);
    assert.equal(memory.transactionCalls.count, 0);
  });

  it("rolls back the entire import when a critical row fails", async () => {
    const memory = createMemoryWriter({ failOnSku: "LDR020" });
    const result = await executeProductMasterImport(commerciallyCompleteRows(), {
      execute: true,
      confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
      writer: memory.writer,
    });
    assert.equal(result.wrote, false);
    assert.equal(result.rolledBack, true);
    assert.equal(memory.state.products.length, 0);
    assert.equal(memory.state.categories.length, 0);
    assert.match(result.errorMessage ?? "", /forced failure LDR020/);
  });

  it("insert-only refuses existing Production SKUs instead of upserting", async () => {
    const memory = createMemoryWriter({ existingSkus: ["LDR003"] });
    const result = await executeProductMasterImport(commerciallyCompleteRows(), {
      execute: true,
      confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
      writer: memory.writer,
    });
    assert.equal(result.wrote, false);
    assert.equal(result.rolledBack, true);
    assert.equal(memory.state.products.length, 0);
    assert.match(result.errorMessage ?? "", /SKU already exists/);
  });

  it("protects against accidental Production invocation", () => {
    assert.throws(() => assertWriteAllowed({ execute: false, confirm: PRODUCT_MASTER_IMPORT_CONFIRM }));
    assert.throws(() =>
      assertWriteAllowed({ execute: true, confirm: "yes" }),
    );
    assert.throws(() =>
      assertWriteAllowed({
        execute: true,
        confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
        lifecycleEvent: "postinstall",
      }),
    );
    assert.throws(() =>
      assertWriteAllowed({
        execute: true,
        confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
        lifecycleEvent: "db:seed",
      }),
    );
    assert.throws(() =>
      assertWriteAllowed({
        execute: true,
        confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
        vercel: "1",
      }),
    );
    assert.doesNotThrow(() =>
      assertWriteAllowed({
        execute: true,
        confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
      }),
    );
    assert.equal(parseProductMasterCliMode(["import"]), "dry-run");
    assert.equal(parseProductMasterCliMode(["import", "--dry-run"]), "dry-run");
    assert.equal(parseProductMasterCliMode(["import", "--execute", "--dry-run"]), "dry-run");
    assert.equal(parseProductMasterCliMode(["validate", "--execute"]), "validate");
    assert.equal(parseProductMasterCliMode(["import", "--execute"]), "execute");
  });

  it("does not copy Singapore commercial defaults into the Production plan", () => {
    const plan = buildProductMasterPlan(fromThailandProductMaster());
    assert.equal(plan.validation.ok, true);
    assert.equal(plan.productsToInsert.length, 38);
    assert.equal(plan.productsToUpdate.length, 0);
    assert.equal(plan.mediaToInsert.length, 0);
    assert.equal(plan.productImagesToInsert.length, 0);
    for (const product of plan.productsToInsert) {
      assert.equal(product.priceMinor, null);
      assert.equal(product.allergenLabel, null);
      assert.equal(product.allergenText, null);
      assert.equal(product.storageLabel, null);
      assert.equal(product.storageText, null);
      assert.equal(product.isActive, false);
      assert.equal(product.available, false);
      assert.equal(product.deliveryEligible, false);
      assert.equal(product.mediaReferences.length, 0);
    }
    const serialized = JSON.stringify(plan.productsToInsert);
    assert.equal(serialized.includes("/product-placeholder.svg"), false);
    assert.equal(serialized.includes("990"), false);
    assert.equal(serialized.includes("priceSgd"), false);
    assert.equal(serialized.includes("Napoléon III"), false);
  });

  it("keeps prisma/seed.ts development-only and unwired from this importer", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    assert.equal(seed.includes("product-master-production-import"), false);
    assert.match(seed, /DEVELOPMENT \/ TEST ONLY/);
    assert.match(seed, /assertDatabaseSeedAllowed/);
  });

  it("inserts a commercially complete fixture transactionally without upsert", async () => {
    const memory = createMemoryWriter();
    const rows = commerciallyCompleteRows();
    assert.equal(validateProductMasterImport(rows).commerciallyComplete, true);
    const result = await executeProductMasterImport(rows, {
      execute: true,
      confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
      writer: memory.writer,
    });
    assert.equal(result.wrote, true);
    assert.equal(result.rolledBack, false);
    assert.equal(result.updatedProductCount, 0);
    assert.equal(memory.state.products.length, 38);
    assert.ok(memory.state.categories.length >= 1);
  });

  it("refuses execute when the live Product Master commercial data is still pending", async () => {
    const memory = createMemoryWriter();
    await assert.rejects(
      () =>
        executeProductMasterImport(fromThailandProductMaster(), {
          execute: true,
          confirm: PRODUCT_MASTER_IMPORT_CONFIRM,
          writer: memory.writer,
        }),
      /commercial data is pending/,
    );
    assert.equal(memory.transactionCalls.count, 0);
    assert.equal(memory.state.products.length, 0);
  });
});

describe("Sprint 35C-1 — source identity", () => {
  it("uses data/thailand-product-master.ts as the authoritative 38-SKU source", () => {
    assert.equal(THAILAND_PRODUCT_MASTER.length, 38);
    const rows = fromThailandProductMaster();
    assert.deepEqual(
      rows.map((row) => row.sku),
      THAILAND_PRODUCT_MASTER.map((row) => row.sku),
    );
  });
});
