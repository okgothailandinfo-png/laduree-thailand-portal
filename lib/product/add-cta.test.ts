import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStorefrontUnavailableDisplay } from "@/lib/catalog/storefront-visibility";
import { applyPreviewTestCatalogOverlay } from "@/lib/preview/preview-test-catalog";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import { isProductAddCtaEnabled } from "@/lib/product/add-cta";
import { sumExactSelectionFromQtyMap } from "@/lib/product/exact-selection";

function overlayLdr003() {
  const product = buildThailandCatalog().products.find(
    (item) => item.sku === "LDR003",
  );
  assert.ok(product);
  return applyPreviewTestCatalogOverlay(product, {
    APP_ENV: "preview",
    PREVIEW_TEST_CATALOG: "true",
  } as NodeJS.ProcessEnv);
}

function ctaForSelection(selected: number) {
  const product = overlayLdr003();
  const group = product.modifierGroups[0];
  assert.ok(group);
  const qtyByOptionKey =
    selected > 0
      ? { [`${group.id}:${group.options[0]}`]: selected }
      : {};
  const exactComplete =
    sumExactSelectionFromQtyMap(group, qtyByOptionKey) ===
    group.exactSelectionQuantity;
  return isProductAddCtaEnabled({
    storefrontUnavailable: isStorefrontUnavailableDisplay(product),
    exactSelectionComplete: exactComplete,
    requiredComplete: exactComplete,
    priceAvailable: product.priceThb !== null && product.priceThb > 0,
  });
}

describe("Sprint 34D — ADD CTA enablement", () => {
  it("keeps ADD disabled at 0/8 and 7/8", () => {
    assert.equal(ctaForSelection(0), false);
    assert.equal(ctaForSelection(7), false);
  });

  it("enables ADD at 8/8 for the preview Napoléon box", () => {
    assert.equal(ctaForSelection(8), true);
  });

  it("keeps ADD closed on the un-overlaid Production/Safe-Draft product", () => {
    const product = buildThailandCatalog().products.find(
      (item) => item.sku === "LDR003",
    );
    assert.ok(product);
    assert.equal(
      isProductAddCtaEnabled({
        storefrontUnavailable: isStorefrontUnavailableDisplay(product),
        exactSelectionComplete: true,
        requiredComplete: true,
        priceAvailable: product.priceThb !== null && product.priceThb > 0,
      }),
      false,
    );
  });
});
