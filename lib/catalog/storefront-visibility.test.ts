import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryPath,
  isLiveListedProduct,
  isStorefrontPdpVisible,
  isStorefrontUnavailableDisplay,
} from "./storefront-visibility";

const draft = {
  sku: "LDR001",
  isActive: false,
  available: false,
};

const live = {
  sku: "LDR001",
  isActive: true,
  available: true,
};

describe("Sprint 33D — storefront visibility", () => {
  it("treats only active+available as live listed", () => {
    assert.equal(isLiveListedProduct(draft), false);
    assert.equal(isLiveListedProduct(live), true);
    assert.equal(
      isLiveListedProduct({ isActive: true, available: false }),
      false,
    );
  });

  it("hides draft PDPs in production", () => {
    assert.equal(isStorefrontPdpVisible(draft, "production"), false);
    assert.equal(isStorefrontPdpVisible(live, "production"), true);
  });

  it("allows Thailand master draft PDPs in non-production for QA", () => {
    assert.equal(isStorefrontPdpVisible(draft, "development"), true);
    assert.equal(
      isStorefrontPdpVisible({ sku: "DEV-BOX", isActive: false, available: false }, "development"),
      false,
    );
  });

  it("shows Unavailable when not available or unpriced", () => {
    assert.equal(
      isStorefrontUnavailableDisplay({ available: false, priceThb: 1290 }),
      true,
    );
    assert.equal(
      isStorefrontUnavailableDisplay({ available: true, priceThb: null }),
      true,
    );
    assert.equal(
      isStorefrontUnavailableDisplay({ available: true, priceThb: 1290 }),
      false,
    );
    assert.equal(
      isStorefrontUnavailableDisplay({ available: true, priceThb: 0 }),
      true,
    );
  });

  it("allows Thailand master draft PDPs in public preview", () => {
    assert.equal(isStorefrontPdpVisible(draft, "preview"), true);
  });

  it("maps All Items to /Category", () => {
    assert.equal(categoryPath("all-items"), "/Category");
    assert.equal(categoryPath("macaron-gift-boxes"), "/Category/macaron-gift-boxes");
  });
});
