import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPendingPreorderQuote,
  createValidDeliveryQuote,
  emptyDeliveryQuote,
  invalidateDeliveryQuoteState,
  isDeliveryQuoteValidForCheckout,
  markDeliveryQuoteUnsupported,
  resolveDeliveryQuoteStatus,
} from "@/app/pickup/delivery-quote";

const WINDOW = {
  id: "w1",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

describe("Delivery quote lifecycle", () => {
  it("starts EMPTY with no display fields", () => {
    const quote = emptyDeliveryQuote();
    assert.equal(quote.status, "EMPTY");
    assert.equal(quote.deliveryDate, null);
    assert.equal(quote.deliveryWindow, null);
    assert.equal(quote.deliveryFee, null);
    assert.equal(quote.trusted, false);
    assert.equal(isDeliveryQuoteValidForCheckout(quote), false);
  });

  it("postal change clears date, window, fee, zone, quoteId, trusted", () => {
    const valid = createValidDeliveryQuote({
      postalCode: "10110",
      zoneId: "z1",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-28",
      deliveryWindow: WINDOW,
      deliveryFee: 99,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    assert.equal(isDeliveryQuoteValidForCheckout(valid), true);

    const invalidated = invalidateDeliveryQuoteState(valid, "10500");
    assert.equal(invalidated.status, "INVALID");
    assert.equal(invalidated.postalCode, "10500");
    assert.equal(invalidated.deliveryDate, null);
    assert.equal(invalidated.deliveryWindow, null);
    assert.equal(invalidated.deliveryFee, null);
    assert.equal(invalidated.zoneId, null);
    assert.equal(invalidated.quoteId, null);
    assert.equal(invalidated.trusted, false);
    assert.equal(isDeliveryQuoteValidForCheckout(invalidated), false);
  });

  it("VALID quote enables checkout; UNSUPPORTED and PENDING do not", () => {
    const valid = createValidDeliveryQuote({
      postalCode: "10110",
      zoneId: "z1",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-28",
      deliveryWindow: WINDOW,
      deliveryFee: 99,
      expiresAt: null,
      createdAt: null,
    });
    assert.equal(isDeliveryQuoteValidForCheckout(valid), true);

    const unsupported = markDeliveryQuoteUnsupported(valid, "00000");
    assert.equal(unsupported.status, "UNSUPPORTED");
    assert.equal(isDeliveryQuoteValidForCheckout(unsupported), false);

    const pending = createPendingPreorderQuote({
      postalCode: "10110",
      zoneId: "z1",
      deliveryFee: 99,
      expiresAt: null,
      createdAt: null,
    });
    assert.equal(pending.status, "PENDING");
    assert.equal(pending.deliveryDate, null);
    assert.equal(isDeliveryQuoteValidForCheckout(pending), false);
  });

  it("EXPIRED overrides VALID when past expiresAt", () => {
    const expired = createValidDeliveryQuote({
      postalCode: "10110",
      zoneId: "z1",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-28",
      deliveryWindow: WINDOW,
      deliveryFee: 99,
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      createdAt: null,
    });
    assert.equal(resolveDeliveryQuoteStatus(expired), "EXPIRED");
    assert.equal(isDeliveryQuoteValidForCheckout(expired), false);
  });

  it("recalculation replaces the entire quote (no stale fields)", () => {
    const first = createValidDeliveryQuote({
      postalCode: "10110",
      zoneId: "z-a",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-28",
      deliveryWindow: WINDOW,
      deliveryFee: 99,
      expiresAt: null,
      createdAt: null,
    });
    const cleared = invalidateDeliveryQuoteState(first, "10500");
    const second = createValidDeliveryQuote({
      postalCode: "10500",
      zoneId: "z-b",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-30",
      deliveryWindow: { ...WINDOW, id: "w2" },
      deliveryFee: 99,
      expiresAt: null,
      createdAt: null,
    });
    assert.equal(cleared.deliveryDate, null);
    assert.equal(second.postalCode, "10500");
    assert.equal(second.deliveryDate, "2026-07-30");
    assert.equal(second.zoneId, "z-b");
    assert.notEqual(second.quoteId, first.quoteId);
    assert.equal(isDeliveryQuoteValidForCheckout(second), true);
  });
});
