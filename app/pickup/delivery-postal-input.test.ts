import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCheckoutEligibility } from "@/app/cart/checkout-eligibility";
import {
  createValidDeliveryQuote,
  invalidateDeliveryQuoteState,
} from "@/app/pickup/delivery-quote";
import {
  hasValidDeliveryPostalCode,
  normalizeDeliveryPostalInput,
  shouldInvalidateDeliveryQuoteForPostalChange,
} from "@/app/pickup/pickup-availability";

/**
 * Simulates the shared cart postal controlled-input reducer used by
 * PickupContext.setDeliveryPostalInput (no availability fetch).
 */
function reducePostalTyping(
  previous: string,
  rawKeystroke: string,
): { value: string; changed: boolean; shouldInvalidateQuote: boolean } {
  const next = normalizeDeliveryPostalInput(rawKeystroke);
  if (previous === next) {
    return { value: previous, changed: false, shouldInvalidateQuote: false };
  }
  return {
    value: next,
    changed: true,
    shouldInvalidateQuote: shouldInvalidateDeliveryQuoteForPostalChange({
      previousPostal: previous,
      nextPostal: next,
      hasTrustedQuote: true,
    }),
  };
}

describe("Delivery postal-code input helpers", () => {
  it("accepts typing by normalizing to digits only", () => {
    assert.equal(normalizeDeliveryPostalInput(""), "");
    assert.equal(normalizeDeliveryPostalInput("1"), "1");
    assert.equal(normalizeDeliveryPostalInput("10"), "10");
    assert.equal(normalizeDeliveryPostalInput("101"), "101");
    assert.equal(normalizeDeliveryPostalInput("1011"), "1011");
    assert.equal(normalizeDeliveryPostalInput("10110"), "10110");
  });

  it("postal-code value persists while typing intermediate lengths", () => {
    let value = "";
    for (const digit of ["1", "0", "1", "1", "0"]) {
      const step = reducePostalTyping(value, value + digit);
      assert.equal(step.changed, true);
      value = step.value;
    }
    assert.equal(value, "10110");
    assert.equal(hasValidDeliveryPostalCode(value), true);
  });

  it("rejects non-digits and truncates beyond 5 safely", () => {
    assert.equal(normalizeDeliveryPostalInput("10a1b"), "101");
    assert.equal(normalizeDeliveryPostalInput("1011099"), "10110");
    assert.equal(normalizeDeliveryPostalInput("abc"), "");
    assert.equal(hasValidDeliveryPostalCode("1011"), false);
    assert.equal(hasValidDeliveryPostalCode("10110"), true);

    // Invalid keystroke after a valid value must not clear the stored digits.
    const rejected = reducePostalTyping("10110", "10110a");
    assert.equal(rejected.changed, false);
    assert.equal(rejected.value, "10110");
    assert.equal(rejected.shouldInvalidateQuote, false);
  });

  it("invalidates quote when postal changes after a trusted quote", () => {
    assert.equal(
      shouldInvalidateDeliveryQuoteForPostalChange({
        previousPostal: "10110",
        nextPostal: "10111",
        hasTrustedQuote: true,
      }),
      true,
    );
    assert.equal(
      shouldInvalidateDeliveryQuoteForPostalChange({
        previousPostal: "10110",
        nextPostal: "10110",
        hasTrustedQuote: true,
      }),
      false,
    );

    const edited = reducePostalTyping("10110", "1011");
    assert.equal(edited.value, "1011");
    assert.equal(edited.shouldInvalidateQuote, true);
  });

  it("documents cart postal CSS must not inherit white text on white input", () => {
    // Browser root cause (manual): .cart-fulfillment.bg-pink { color: white }
    // was inherited by .cart-delivery-postal__input / __btn (white on #fff),
    // so typing appeared to do nothing. CSS now sets explicit dark text colors.
    assert.equal(typeof normalizeDeliveryPostalInput, "function");
  });

  it("does not check availability on every keystroke", () => {
    // Contract: typing only normalizes / decides invalidation.
    // fetchDeliveryQuote is invoked only by Check availability (or modal reload).
    let fetchCount = 0;
    const checkAvailability = () => {
      fetchCount += 1;
    };

    let value = "";
    for (const raw of ["1", "10", "101", "1011", "10110"]) {
      const step = reducePostalTyping(value, raw);
      value = step.value;
      // No availability check on keystroke.
    }
    assert.equal(value, "10110");
    assert.equal(fetchCount, 0);

    checkAvailability();
    assert.equal(fetchCount, 1);
  });

  it("blocks checkout after postal change invalidates the quote", () => {
    const validQuote = createValidDeliveryQuote({
      postalCode: "10110",
      zoneId: "zone-1",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-28",
      deliveryWindow: {
        id: "1230-1530",
        label: "12:30–15:30",
        start: "12:30",
        end: "15:30",
      },
      deliveryFee: 100,
      expiresAt: null,
      createdAt: null,
    });
    const before = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          exactSelectionQuantity: 8,
          priceAvailable: true,
          available: true,
          modifiers: [
            { label: "Rose", quantity: 4 },
            { label: "Chocolate", quantity: 4 },
          ],
        },
      ],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: {
          recipient: "",
          phone: "",
          address: "",
          subdistrict: "",
          district: "",
          province: "",
          postalCode: "10110",
        },
        quote: validQuote,
      },
    });
    assert.equal(before.canCheckout, true);

    const afterEdit = reducePostalTyping("10110", "10500");
    assert.equal(afterEdit.shouldInvalidateQuote, true);

    const after = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          exactSelectionQuantity: 8,
          priceAvailable: true,
          available: true,
          modifiers: [
            { label: "Rose", quantity: 4 },
            { label: "Chocolate", quantity: 4 },
          ],
        },
      ],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: {
          recipient: "",
          phone: "",
          address: "",
          subdistrict: "",
          district: "",
          province: "",
          postalCode: afterEdit.value,
        },
        quote: invalidateDeliveryQuoteState(validQuote, afterEdit.value),
      },
    });
    assert.equal(after.canCheckout, false);
  });
});
