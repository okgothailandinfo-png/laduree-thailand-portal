import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXACT_SELECTION_MESSAGE_KEYS,
  formatExactSelectionProgress,
  sumExactSelectionFromQtyMap,
  sumExactSelectionQuantity,
  validateExactSelectionModifiers,
} from "./exact-selection";

const flavours = {
  id: "choice-of-macarons",
  type: "quantity" as const,
  options: ["Rose", "Chocolate", "Vanilla"],
  exactSelectionQuantity: 8,
};

describe("exact-selection", () => {
  it("requires exact flavour quantity", () => {
    const result = validateExactSelectionModifiers(
      [flavours],
      [
        { label: "Rose", quantity: 4 },
        { label: "Chocolate", quantity: 3 },
      ],
      1,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INCOMPLETE");
  });

  it("rejects totals that exceed the box size", () => {
    const result = validateExactSelectionModifiers(
      [flavours],
      [{ label: "Rose", quantity: 9 }],
      1,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "EXCEEDED");
  });

  it("accepts a complete selection with outer quantity greater than 1", () => {
    const result = validateExactSelectionModifiers(
      [flavours],
      [
        { label: "Rose", quantity: 4 },
        { label: "Chocolate", quantity: 4 },
      ],
      2,
    );
    assert.equal(result.ok, true);
  });

  it("stores flavour quantities via sum helpers", () => {
    assert.equal(
      sumExactSelectionQuantity(flavours, [
        { label: "Rose", quantity: 5 },
        { label: "Vanilla", quantity: 3 },
      ]),
      8,
    );
    assert.equal(
      sumExactSelectionFromQtyMap(flavours, {
        "choice-of-macarons:Rose": 5,
        "choice-of-macarons:Vanilla": 3,
      }),
      8,
    );
  });

  it("formats before / during / completed customer messages", () => {
    assert.equal(formatExactSelectionProgress(0, 8), "Please select 8");
    assert.equal(formatExactSelectionProgress(5, 8), "Please select 3 more");
    assert.equal(formatExactSelectionProgress(8, 8), "8 of 8 selected");
    assert.equal(
      EXACT_SELECTION_MESSAGE_KEYS.pleaseSelectNMore,
      "product.exactSelection.pleaseSelectNMore",
    );
  });
});
