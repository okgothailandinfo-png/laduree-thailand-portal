import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  firstInvalidCardFieldId,
  formatCardNumberInput,
  safeCardDisplayFromNumber,
  validateMockCard,
} from "./card-validation";

describe("mock card validation", () => {
  const valid = {
    cardholderName: "Ada Lovelace",
    cardNumber: "4242 4242 4242 4242",
    expiry: "12/30",
    cvv: "123",
  };

  it("rejects invalid cardholder name", () => {
    const errors = validateMockCard({ ...valid, cardholderName: "  " });
    assert.equal(errors.cardholderName, "Cardholder name is required.");
  });

  it("rejects invalid card number", () => {
    assert.ok(validateMockCard({ ...valid, cardNumber: "abcd" }).cardNumber);
    assert.ok(validateMockCard({ ...valid, cardNumber: "1234" }).cardNumber);
  });

  it("rejects invalid expiry format", () => {
    assert.equal(
      validateMockCard({ ...valid, expiry: "13/30" }).expiry,
      "Expiry must be MM/YY.",
    );
    assert.ok(validateMockCard({ ...valid, expiry: "1/30" }).expiry);
  });

  it("rejects expired mock card", () => {
    const now = new Date(2026, 7, 5); // Aug 2026
    const errors = validateMockCard({ ...valid, expiry: "01/26" }, now);
    assert.equal(errors.expiry, "Card expiry date has passed.");
  });

  it("rejects invalid CVV", () => {
    assert.ok(validateMockCard({ ...valid, cvv: "12" }).cvv);
    assert.ok(validateMockCard({ ...valid, cvv: "12a" }).cvv);
    assert.equal(validateMockCard({ ...valid, cvv: "1234" }).cvv, undefined);
  });

  it("accepts a valid mock card", () => {
    const errors = validateMockCard(valid, new Date(2026, 0, 1));
    assert.deepEqual(errors, {});
  });

  it("formats card number with digits only grouping", () => {
    assert.equal(formatCardNumberInput("4242424242424242"), "4242 4242 4242 4242");
  });

  it("builds safe card display without full PAN", () => {
    const display = safeCardDisplayFromNumber("4242 4242 4242 4242");
    assert.equal(display, "Card ending in 4242");
    assert.equal(display.includes("4242 4242 4242 4242"), false);
  });

  it("focuses first invalid field id in order", () => {
    assert.equal(
      firstInvalidCardFieldId({
        cvv: "bad",
        cardholderName: "required",
      }),
      "cardholderName",
    );
  });
});
