import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDeliveryEligibleProduct,
  parseProductBehavior,
  resolveExactSelectionQuantityForBehavior,
  snapshotProductBehavior,
  usesExactSelection,
  usesOptionalConfiguration,
} from "./product-behavior";

describe("Sprint 33B — product behavior", () => {
  it("identifies CONFIGURABLE_BOX as exact-selection only", () => {
    assert.equal(usesExactSelection("CONFIGURABLE_BOX"), true);
    assert.equal(usesExactSelection("FIXED_PACK"), false);
    assert.equal(usesExactSelection("SIMPLE_PRODUCT"), false);
    assert.equal(usesExactSelection("OPTIONAL_CONFIGURABLE"), false);
    assert.equal(usesOptionalConfiguration("OPTIONAL_CONFIGURABLE"), true);
  });

  it("parses known behaviors and falls back safely", () => {
    assert.equal(parseProductBehavior("FIXED_PACK"), "FIXED_PACK");
    assert.equal(parseProductBehavior("nope"), "SIMPLE_PRODUCT");
    assert.equal(parseProductBehavior(null, "CONFIGURABLE_BOX"), "CONFIGURABLE_BOX");
  });

  it("resolves exact selection quantity only for CONFIGURABLE_BOX", () => {
    const groups = [
      {
        type: "quantity" as const,
        exactSelectionQuantity: 8,
      },
    ];
    assert.equal(
      resolveExactSelectionQuantityForBehavior({
        productBehavior: "CONFIGURABLE_BOX",
        modifierGroups: groups,
      }),
      8,
    );
    assert.equal(
      resolveExactSelectionQuantityForBehavior({
        productBehavior: "FIXED_PACK",
        packSize: 12,
        modifierGroups: groups,
      }),
      null,
    );
  });

  it("snapshots behavior/pack for historical OrderItem integrity", () => {
    const snapshot = snapshotProductBehavior({
      productBehavior: "CONFIGURABLE_BOX",
      packSize: 8,
      deliveryEligible: true,
      modifierGroups: [
        { type: "quantity", exactSelectionQuantity: 8 },
      ],
    });
    assert.deepEqual(snapshot, {
      productBehavior: "CONFIGURABLE_BOX",
      packSize: 8,
      exactSelectionQuantity: 8,
      deliveryEligible: true,
    });
  });

  it("Sprint 33C — unresolved deliveryEligible is fail-closed ineligible", () => {
    assert.equal(isDeliveryEligibleProduct({}), false);
    assert.equal(isDeliveryEligibleProduct({ deliveryEligible: undefined }), false);
    assert.equal(isDeliveryEligibleProduct({ deliveryEligible: true }), true);
    assert.equal(isDeliveryEligibleProduct({ deliveryEligible: false }), false);
  });
});
