import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEV_BEHAVIOR_FIXTURES } from "@/src/server/repositories/mock/data";
import { buildValidModifiersForProduct } from "@/src/server/repositories/smoke/order-modifiers";

describe("Sprint 29 — smoke order modifiers", () => {
  it("builds exact-8 selection from DEV configurable fixture", () => {
    const product = DEV_BEHAVIOR_FIXTURES[0]!;
    const modifiers = buildValidModifiersForProduct(product);
    const flavourTotal = modifiers
      .filter((row) =>
        product.modifierGroups[0]!.options.includes(row.label),
      )
      .reduce((sum, row) => sum + (row.quantity ?? 0), 0);

    assert.equal(flavourTotal, 8);
    assert.ok(modifiers.length > 0);
  });

  it("returns empty modifiers when product has no groups", () => {
    assert.deepEqual(buildValidModifiersForProduct({ modifierGroups: [] }), []);
  });
});
