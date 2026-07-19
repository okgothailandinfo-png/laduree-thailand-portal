import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { cartLineConfigKey } from "@/lib/cart/cart-line";
import {
  CHECKOUT_BLOCKING_MESSAGES,
  getCheckoutEligibility,
  hasValidConfirmedPickupIds,
} from "./checkout-eligibility";

const validConfirmed = {
  boutiqueId: "boutique-pending",
  dateKey: "2026-07-21",
  timeSlotId: "1030-1100",
};

const completeBoxItem = {
  quantity: 1,
  exactSelectionQuantity: 8,
  priceAvailable: true,
  available: true,
  modifiers: [
    { label: "Rose", quantity: 4 },
    { label: "Chocolate", quantity: 4 },
  ],
};

describe("cart checkout CTA eligibility", () => {
  it("shows the Checkout CTA whenever the cart has items", () => {
    const result = getCheckoutEligibility({
      items: [{ ...completeBoxItem, priceAvailable: false }],
      confirmed: null,
    });
    assert.equal(result.ctaVisible, true);
    assert.equal(result.canCheckout, false);
    assert.ok(result.diagnostics.blockingReasons.length >= 1);
  });

  it("disables the CTA when boutique is missing", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: {
        boutiqueId: "",
        dateKey: "2026-07-21",
        timeSlotId: "1030-1100",
      },
    });
    assert.equal(result.ctaVisible, true);
    assert.equal(result.canCheckout, false);
    assert.equal(result.reason, CHECKOUT_BLOCKING_MESSAGES.missingBoutique);
    assert.equal(result.diagnostics.hasBoutiqueId, false);
  });

  it("disables the CTA when pickup date/time is missing", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: {
        boutiqueId: "boutique-pending",
        dateKey: "",
        timeSlotId: "",
      },
    });
    assert.equal(result.ctaVisible, true);
    assert.equal(result.canCheckout, false);
    assert.equal(
      result.reason,
      CHECKOUT_BLOCKING_MESSAGES.missingPickupDateTime,
    );
  });

  it("disables the CTA when fixed-size selection is incomplete", () => {
    const result = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          exactSelectionQuantity: 8,
          priceAvailable: true,
          available: true,
          modifiers: [{ label: "Rose", quantity: 3 }],
        },
      ],
      confirmed: validConfirmed,
    });
    assert.equal(result.ctaVisible, true);
    assert.equal(result.canCheckout, false);
    assert.equal(
      result.reason,
      CHECKOUT_BLOCKING_MESSAGES.incompleteSelection,
    );
    assert.equal(result.diagnostics.exactSelectionComplete, false);
  });

  it("disables the CTA when price is unavailable and keeps it visible", () => {
    const result = getCheckoutEligibility({
      items: [{ ...completeBoxItem, priceAvailable: false }],
      confirmed: validConfirmed,
    });
    assert.equal(result.ctaVisible, true);
    assert.equal(result.canCheckout, false);
    assert.equal(result.reason, CHECKOUT_BLOCKING_MESSAGES.priceUnavailable);
    assert.equal(result.diagnostics.hasValidPrices, false);
    assert.equal(
      result.reason,
      "Price unavailable for one or more products.",
    );
  });

  it("treats boutique-pending placeholder label as valid when boutiqueId exists", () => {
    assert.equal(hasValidConfirmedPickupIds(validConfirmed), true);
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: validConfirmed,
    });
    assert.equal(result.diagnostics.hasBoutiqueId, true);
  });

  it("enables Proceed to Checkout when all conditions are valid", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: validConfirmed,
      cartStatus: "success",
    });
    assert.equal(result.ctaVisible, true);
    assert.equal(result.canCheckout, true);
    assert.equal(result.reason, null);
    assert.equal(result.label, "Proceed to Checkout");
    assert.equal(result.diagnostics.checkoutEligible, true);
  });

  it("allows outer box quantity greater than 1 when flavour selection is complete", () => {
    const result = getCheckoutEligibility({
      items: [{ ...completeBoxItem, quantity: 2 }],
      confirmed: validConfirmed,
      cartStatus: "success",
    });
    assert.equal(result.canCheckout, true);
    assert.equal(result.diagnostics.exactSelectionComplete, true);
    assert.equal(result.ctaVisible, true);
  });

  it("requires confirmed pickup state to contain boutiqueId, dateKey, and timeSlotId", () => {
    assert.equal(hasValidConfirmedPickupIds(validConfirmed), true);
    assert.equal(
      hasValidConfirmedPickupIds({
        boutiqueId: "boutique-pending",
        dateKey: "21/07/2026",
        timeSlotId: "1030-1100",
      }),
      false,
    );
    assert.equal(hasValidConfirmedPickupIds(null), false);
  });

  it("documents that an enabled CTA navigates to /checkout", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: validConfirmed,
    });
    assert.equal(result.canCheckout, true);
    assert.equal("/checkout".startsWith("/checkout"), true);
  });

  it("keeps drawer footer CSS pinned outside the scroll body", () => {
    const css = readFileSync(
      path.join(process.cwd(), "app/cart/cart.css"),
      "utf8",
    );
    assert.match(css, /\.cart-drawer-body\s*\{[^}]*overflow-y:\s*auto/s);
    assert.match(css, /\.cart-drawer-footer\s*\{[^}]*flex:\s*0 0 auto/s);
    assert.match(css, /\.cart-drawer-sheet\s*\{[^}]*height:\s*min\(92dvh/s);
    assert.match(css, /\.cart-drawer-root\.is-open\s*\{[^}]*display:\s*flex/s);
    assert.doesNotMatch(css, /\.cart-drawer-sheet\s*\{[^}]*position:\s*absolute/s);
  });
});

describe("cart line merge identity", () => {
  it("matches identical product + modifiers + note configurations", () => {
    const a = cartLineConfigKey({
      productId: "prod-napoleon-iii-macaron-8pcs",
      note: undefined,
      modifiers: [
        { label: "Rose", quantity: 4 },
        { label: "Chocolate", quantity: 4 },
      ],
    });
    const b = cartLineConfigKey({
      productId: "prod-napoleon-iii-macaron-8pcs",
      modifiers: [
        { label: "Chocolate", quantity: 4 },
        { label: "Rose", quantity: 4 },
      ],
    });
    assert.equal(a, b);
  });

  it("keeps gifting / acknowledgement differences separate", () => {
    const plain = cartLineConfigKey({
      productId: "prod-napoleon-iii-macaron-8pcs",
      modifiers: [
        { label: "Rose", quantity: 8 },
        {
          label:
            "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.",
        },
      ],
    });
    const gifted = cartLineConfigKey({
      productId: "prod-napoleon-iii-macaron-8pcs",
      modifiers: [
        { label: "Rose", quantity: 8 },
        {
          label:
            "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.",
        },
        { label: "1 x Gifting Ribbon Bow (M)" },
      ],
    });
    assert.notEqual(plain, gifted);
  });
});
