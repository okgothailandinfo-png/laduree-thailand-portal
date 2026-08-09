import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";
import { parseProductModifierGroups } from "@/src/server/repositories/prisma/product-modifiers";

describe("Sprint 29 — Prisma product modifier JSON", () => {
  it("round-trips mock Napoleon modifier groups without inventing fields", () => {
    const source = MOCK_PRODUCTS[0]!.modifierGroups;
    const parsed = parseProductModifierGroups(source);

    assert.equal(parsed.length, source.length);
    assert.equal(parsed[0]?.id, "choice-of-macarons");
    assert.equal(parsed[0]?.exactSelectionQuantity, 8);
    assert.equal(parsed[0]?.options.length, 16);
    assert.equal(parsed[1]?.isAcknowledgement, true);
    assert.match(
      parsed[1]?.options[0] ?? "",
      /\[CONTENT PENDING APPROVAL\]/,
    );
    assert.equal(parsed[2]?.optionDetails?.[0]?.priceMinor, null);
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

  it("keeps Singapore allergen referral wording from mock reference intact", () => {
    const product = MOCK_PRODUCTS[0]!;
    assert.equal(product.allergenLabel, "Allergen Information:");
    assert.match(product.allergenText, /Allergens page/);
  });
});
