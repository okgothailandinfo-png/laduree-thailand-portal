import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";
import { buildValidModifiersForProduct } from "@/src/server/repositories/smoke/order-modifiers";

describe("Sprint 29 — smoke order modifiers", () => {
  it("builds exact-8 flavours plus pickup acknowledgement from mock product", () => {
    const product = MOCK_PRODUCTS[0]!;
    const modifiers = buildValidModifiersForProduct(product);
    const flavourTotal = modifiers
      .filter((row) =>
        product.modifierGroups[0]!.options.includes(row.label),
      )
      .reduce((sum, row) => sum + (row.quantity ?? 0), 0);

    assert.equal(flavourTotal, 8);
    assert.ok(
      modifiers.some((row) =>
        row.label.includes("[CONTENT PENDING APPROVAL] I acknowledge"),
      ),
    );
  });

  it("returns empty modifiers when product has no groups", () => {
    assert.deepEqual(buildValidModifiersForProduct({ modifierGroups: [] }), []);
  });
});
