import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEV_BEHAVIOR_FIXTURES } from "@/src/server/repositories/mock/data";
import { parseProductModifierGroups } from "@/src/server/repositories/prisma/product-modifiers";

describe("Sprint 29 — Prisma product modifier JSON", () => {
  it("round-trips DEV configurable fixture modifier groups without inventing fields", () => {
    const source = DEV_BEHAVIOR_FIXTURES[0]!.modifierGroups;
    const parsed = parseProductModifierGroups(source);

    assert.equal(parsed.length, source.length);
    assert.equal(parsed[0]?.id, "choice-of-items");
    assert.equal(parsed[0]?.exactSelectionQuantity, 8);
    assert.equal(parsed[0]?.options.length, 4);
    assert.equal(parsed[0]?.type, "quantity");
  });

  it("returns empty array for missing or corrupt JSON", () => {
    assert.deepEqual(parseProductModifierGroups(null), []);
    assert.deepEqual(parseProductModifierGroups({}), []);
    assert.deepEqual(parseProductModifierGroups("[]"), []);
    assert.deepEqual(
      parseProductModifierGroups([{ id: "x", title: "No type", options: [] }]),
      [],
    );
  });

  it("keeps Singapore allergen referral wording from fixture reference intact", () => {
    const product = DEV_BEHAVIOR_FIXTURES[0]!;
    assert.equal(product.allergenLabel, "Allergen Information:");
    assert.match(product.allergenText, /Allergens page/);
  });
});
