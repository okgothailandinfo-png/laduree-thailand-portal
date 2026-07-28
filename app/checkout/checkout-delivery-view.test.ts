import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCheckoutDeliveryView } from "@/app/checkout/checkout-delivery-view";
import {
  createValidDeliveryQuote,
  emptyDeliveryQuote,
  invalidateDeliveryQuoteState,
  markDeliveryQuoteUnsupported,
} from "@/app/pickup/delivery-quote";

const WINDOW = {
  id: "w1",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

describe("Checkout delivery view — single source of truth", () => {
  it("VALID quote enables payment and shows summary; hides unavailable banner", () => {
    const quote = createValidDeliveryQuote({
      postalCode: "10110",
      zoneId: "z1",
      deliveryMode: "EARLIEST_AVAILABLE",
      deliveryDate: "2026-07-28",
      deliveryWindow: WINDOW,
      deliveryFee: 99,
      expiresAt: null,
      createdAt: null,
    });
    const view = getCheckoutDeliveryView(quote);
    assert.equal(view.status, "VALID");
    assert.equal(view.isValid, true);
    assert.equal(view.showSummary, true);
    assert.equal(view.showUnavailableBanner, false);
    assert.equal(view.canContinueToPayment, true);
    assert.equal(view.deliveryDate, "2026-07-28");
    assert.equal(view.deliveryFee, 99);
    assert.ok(view.deliveryWindow);
  });

  it("INVALID quote hides summary, shows banner, disables payment", () => {
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
    const invalidated = invalidateDeliveryQuoteState(valid, "10500");
    const view = getCheckoutDeliveryView(invalidated);
    assert.equal(view.status, "INVALID");
    assert.equal(view.showSummary, false);
    assert.equal(view.showUnavailableBanner, true);
    assert.equal(view.canContinueToPayment, false);
    assert.equal(view.deliveryDate, null);
    assert.equal(view.deliveryWindow, null);
    assert.equal(view.deliveryFee, null);
  });

  it("UNSUPPORTED and EMPTY follow the same single-gate rules", () => {
    const unsupported = markDeliveryQuoteUnsupported(
      emptyDeliveryQuote({ deliveryMode: "EARLIEST_AVAILABLE" }),
      "00000",
    );
    const unsupportedView = getCheckoutDeliveryView(unsupported);
    assert.equal(unsupportedView.showSummary, false);
    assert.equal(unsupportedView.showUnavailableBanner, true);
    assert.equal(unsupportedView.canContinueToPayment, false);

    const emptyView = getCheckoutDeliveryView(
      emptyDeliveryQuote({ status: "EMPTY" }),
    );
    assert.equal(emptyView.showUnavailableBanner, true);
    assert.equal(emptyView.canContinueToPayment, false);
  });

  it("summary and payment never disagree for the same quote", () => {
    const cases = [
      emptyDeliveryQuote(),
      invalidateDeliveryQuoteState(
        createValidDeliveryQuote({
          postalCode: "10110",
          zoneId: "z1",
          deliveryMode: "EARLIEST_AVAILABLE",
          deliveryDate: "2026-07-28",
          deliveryWindow: WINDOW,
          deliveryFee: 99,
          expiresAt: null,
          createdAt: null,
        }),
      ),
      createValidDeliveryQuote({
        postalCode: "10110",
        zoneId: "z1",
        deliveryMode: "EARLIEST_AVAILABLE",
        deliveryDate: "2026-07-28",
        deliveryWindow: WINDOW,
        deliveryFee: 99,
        expiresAt: null,
        createdAt: null,
      }),
    ];
    for (const quote of cases) {
      const view = getCheckoutDeliveryView(quote);
      assert.equal(view.showSummary, view.canContinueToPayment);
      assert.equal(view.showUnavailableBanner, !view.isValid);
      if (view.showSummary) {
        assert.ok(view.deliveryDate);
        assert.ok(view.deliveryWindow);
        assert.equal(typeof view.deliveryFee, "number");
      } else {
        assert.equal(view.deliveryDate, null);
        assert.equal(view.deliveryWindow, null);
        assert.equal(view.deliveryFee, null);
      }
    }
  });
});
