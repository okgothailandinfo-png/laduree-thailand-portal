import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateProductPurchasability } from "@/lib/catalog/product-purchasability";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import { validateExactSelectionModifiers } from "@/lib/product/exact-selection";
import { SAMPLE_PRODUCT } from "@/app/product/sample-product";
import { THAILAND_PRODUCT_MASTER } from "@/data/thailand-product-master";
import {
  PREVIEW_TEST_CATALOG_PRICE_MINOR,
  PREVIEW_TEST_CATALOG_PRICE_THB,
  PREVIEW_TEST_CATALOG_SKUS,
  PREVIEW_TEST_MACARON_FLAVORS,
  applyPreviewTestCatalogOverlay,
  isPreviewTestCatalogEnabled,
} from "./preview-test-catalog";

function ldr003() {
  const product = buildThailandCatalog().products.find(
    (item) => item.sku === "LDR003",
  );
  assert.ok(product);
  return product;
}

describe("Sprint 34C — preview test catalog overlay", () => {
  it("uses Singapore portal macaron flavor labels, not invented names", () => {
    assert.deepEqual(
      [...PREVIEW_TEST_MACARON_FLAVORS],
      [...SAMPLE_PRODUCT.modifierGroups[0].options],
    );
  });

  it("enables only when APP_ENV=preview and PREVIEW_TEST_CATALOG is true", () => {
    assert.equal(
      isPreviewTestCatalogEnabled({
        APP_ENV: "preview",
        PREVIEW_TEST_CATALOG: "true",
      } as NodeJS.ProcessEnv),
      true,
    );
    assert.equal(
      isPreviewTestCatalogEnabled({
        APP_ENV: "preview",
        PREVIEW_TEST_CATALOG: "1",
      } as NodeJS.ProcessEnv),
      true,
    );
    assert.equal(
      isPreviewTestCatalogEnabled({
        APP_ENV: "preview",
      } as NodeJS.ProcessEnv),
      false,
    );
    assert.equal(
      isPreviewTestCatalogEnabled({
        APP_ENV: "production",
        PREVIEW_TEST_CATALOG: "true",
      } as NodeJS.ProcessEnv),
      false,
    );
    assert.equal(
      isPreviewTestCatalogEnabled({
        APP_ENV: "staging",
        PREVIEW_TEST_CATALOG: "true",
      } as NodeJS.ProcessEnv),
      false,
    );
  });

  it("does not mutate Thailand Product Master prices or options", () => {
    const master = THAILAND_PRODUCT_MASTER.find((row) => row.sku === "LDR003");
    assert.ok(master);
    assert.equal(master.priceThb, null);
    assert.deepEqual(master.selectionOptions, []);

    applyPreviewTestCatalogOverlay(ldr003(), {
      APP_ENV: "preview",
      PREVIEW_TEST_CATALOG: "true",
    } as NodeJS.ProcessEnv);

    assert.equal(master.priceThb, null);
    assert.deepEqual(master.selectionOptions, []);
    assert.equal(buildThailandCatalog().products.find((p) => p.sku === "LDR003")?.priceMinor, null);
  });

  it("makes only designated preview SKUs purchasable", () => {
    const env = {
      APP_ENV: "preview",
      PREVIEW_TEST_CATALOG: "true",
    } as NodeJS.ProcessEnv;
    const catalog = buildThailandCatalog();
    for (const product of catalog.products) {
      const overlaid = applyPreviewTestCatalogOverlay(product, env);
      const purchasable = evaluateProductPurchasability(overlaid).purchasable;
      if (PREVIEW_TEST_CATALOG_SKUS.includes(product.sku as (typeof PREVIEW_TEST_CATALOG_SKUS)[number])) {
        assert.equal(purchasable, true);
        assert.equal(overlaid.priceThb, PREVIEW_TEST_CATALOG_PRICE_THB);
        assert.equal(overlaid.priceMinor, PREVIEW_TEST_CATALOG_PRICE_MINOR);
        assert.deepEqual(
          overlaid.modifierGroups[0]?.options,
          [...PREVIEW_TEST_MACARON_FLAVORS],
        );
      } else {
        assert.equal(purchasable, false);
        assert.equal(overlaid.priceMinor, product.priceMinor);
      }
    }
  });

  it("keeps Production and unflagged preview fail-closed", () => {
    const product = ldr003();
    assert.equal(
      evaluateProductPurchasability(
        applyPreviewTestCatalogOverlay(product, {
          APP_ENV: "preview",
        } as NodeJS.ProcessEnv),
      ).purchasable,
      false,
    );
    assert.equal(
      evaluateProductPurchasability(
        applyPreviewTestCatalogOverlay(product, {
          APP_ENV: "production",
          PREVIEW_TEST_CATALOG: "true",
        } as NodeJS.ProcessEnv),
      ).purchasable,
      false,
    );
  });

  it("preserves Macaron exact-selection quantity rules on the overlay", () => {
    const overlaid = applyPreviewTestCatalogOverlay(ldr003(), {
      APP_ENV: "preview",
      PREVIEW_TEST_CATALOG: "true",
    } as NodeJS.ProcessEnv);
    assert.equal(overlaid.modifierGroups[0]?.exactSelectionQuantity, 8);
    assert.equal(
      validateExactSelectionModifiers(
        overlaid.modifierGroups,
        [
          { label: "Rose", quantity: 4 },
          { label: "Chocolate", quantity: 4 },
        ],
        1,
      ).ok,
      true,
    );
    assert.equal(
      validateExactSelectionModifiers(
        overlaid.modifierGroups,
        [
          { label: "Rose", quantity: 3 },
          { label: "Chocolate", quantity: 4 },
        ],
        1,
      ).ok,
      false,
    );
    assert.equal(
      validateExactSelectionModifiers(
        overlaid.modifierGroups,
        [
          { label: "Rose", quantity: 5 },
          { label: "Chocolate", quantity: 4 },
        ],
        1,
      ).ok,
      false,
    );
  });
});
