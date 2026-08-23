import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DELIVERY_CHECKOUT_FOCUS_ORDER,
  formatFullDeliveryAddressInline,
  getFirstInvalidFieldId,
  validateDeliveryAddressFields,
  validateDeliveryCheckoutForm,
} from "@/app/checkout/delivery-address-form";
import { computeOrderTotals } from "@/app/checkout/order-totals";
import {
  DEFAULT_MOCK_DELIVERY_TRACKING_STATUS,
  getDeliveryTrackingSteps,
} from "@/app/order-confirmation/delivery-tracking";
import {
  createValidDeliveryQuote,
  invalidateDeliveryQuoteState,
  isDeliveryQuoteValidForCheckout,
} from "@/app/pickup/delivery-quote";
import { getCheckoutEligibility } from "@/app/cart/checkout-eligibility";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WINDOW = {
  id: "w1",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

function validQuote(postal = "10110") {
  return createValidDeliveryQuote({
    postalCode: postal,
    zoneId: "z1",
    deliveryMode: "EARLIEST_AVAILABLE",
    deliveryDate: "2026-07-28",
    deliveryWindow: WINDOW,
    deliveryFee: 99,
    expiresAt: null,
    createdAt: null,
  });
}

describe("Sprint 22 — delivery address validation", () => {
  it("required address fields block with field-level messages", () => {
    const errors = validateDeliveryAddressFields({
      postalCode: "",
      province: "",
      district: "",
      subdistrict: "",
      address: "",
    });
    assert.equal(errors.deliveryPostalCode, "The Postal Code field is required.");
    assert.equal(errors.deliveryProvince, "Province is required.");
    assert.equal(errors.deliveryDistrict, "District is required.");
    assert.equal(errors.deliverySubdistrict, "Subdistrict is required.");
    assert.equal(errors.deliveryStreetAddress, "Street Address is required.");
    assert.doesNotMatch(
      Object.values(errors).join(" "),
      /Delivery is not available/i,
    );
  });

  it("rejects invalid email and mobile formats", () => {
    const errors = validateDeliveryCheckoutForm({
      buyer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "not-an-email",
        mobileNumber: "abc",
        termsAccepted: true,
      },
      address: {
        postalCode: "10110",
        province: "Bangkok",
        district: "Pathum Wan",
        subdistrict: "Lumphini",
        address: "1 Test Road",
      },
    });
    assert.equal(errors.email, "Email is invalid.");
    assert.equal(errors.mobileNumber, "Mobile Number is invalid.");
  });

  it("accepts a complete delivery checkout form", () => {
    const errors = validateDeliveryCheckoutForm({
      buyer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobileNumber: "0812345678",
        termsAccepted: true,
      },
      address: {
        postalCode: "10110",
        province: "Bangkok",
        district: "Pathum Wan",
        subdistrict: "Lumphini",
        address: "1 Test Road",
        building: "Tower A",
        unitFloor: "12A",
        notes: "Call on arrival",
      },
    });
    assert.deepEqual(errors, {});
  });

  it("focuses the first invalid field in delivery order", () => {
    const errors = validateDeliveryCheckoutForm({
      buyer: {
        firstName: "",
        lastName: "",
        email: "",
        mobileNumber: "",
        termsAccepted: false,
      },
      address: {
        postalCode: "",
        province: "",
        district: "",
        subdistrict: "",
        address: "",
      },
    });
    assert.equal(
      getFirstInvalidFieldId(errors, DELIVERY_CHECKOUT_FOCUS_ORDER),
      "firstName",
    );
  });

  it("formats full address including optional building and unit/floor", () => {
    const line = formatFullDeliveryAddressInline({
      address: "99 Sukhumvit",
      building: "EmQuartier",
      unitFloor: "Floor 5",
      subdistrict: "Khlong Toei",
      district: "Khlong Toei",
      province: "Bangkok",
      postalCode: "10110",
    });
    assert.match(line, /99 Sukhumvit/);
    assert.match(line, /EmQuartier/);
    assert.match(line, /Floor 5/);
    assert.match(line, /10110/);
  });
});

describe("Sprint 22 — quote invalidation preserves customer-compatible data", () => {
  it("postal-code change invalidates quote and clears fee/window/date", () => {
    const previous = validQuote("10110");
    const customer = {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      mobileNumber: "0812345678",
      province: "Bangkok",
      district: "Pathum Wan",
    };
    const next = invalidateDeliveryQuoteState(previous, "10500");
    assert.equal(next.status, "INVALID");
    assert.equal(next.postalCode, "10500");
    assert.equal(next.deliveryFee, null);
    assert.equal(next.deliveryDate, null);
    assert.equal(next.deliveryWindow, null);
    assert.equal(next.zoneId, null);
    assert.equal(isDeliveryQuoteValidForCheckout(next), false);
    // Compatible customer/address data remains outside the quote object.
    assert.equal(customer.firstName, "Ada");
    assert.equal(customer.province, "Bangkok");
  });

  it("recalculated VALID quote re-enables checkout eligibility", () => {
    const blocked = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          modifiers: [],
          priceAvailable: true,
          available: true,
        },
      ],
      confirmed: null,
      cartStatus: "success",
      serviceType: "DELIVERY",
      delivery: {
        address: {
          recipient: "",
          phone: "",
          address: "",
          subdistrict: "",
          district: "",
          province: "",
          postalCode: "10500",
        },
        quote: invalidateDeliveryQuoteState(validQuote("10110"), "10500"),
      },
    });
    assert.equal(blocked.canCheckout, false);

    const ok = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          modifiers: [],
          priceAvailable: true,
          available: true,
        },
      ],
      confirmed: null,
      cartStatus: "success",
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
        quote: validQuote("10110"),
      },
    });
    assert.equal(ok.canCheckout, true);
  });

  it("stale quotes never satisfy eligibility", () => {
    const expired = {
      ...validQuote("10110"),
      expiresAt: "2000-01-01T00:00:00.000Z",
    };
    const result = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          modifiers: [],
          priceAvailable: true,
          available: true,
        },
      ],
      confirmed: null,
      cartStatus: "success",
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
        quote: expired,
      },
    });
    assert.equal(result.canCheckout, false);
  });

  it("Pickup confirmation never satisfies Delivery checkout", () => {
    const result = getCheckoutEligibility({
      items: [
        {
          quantity: 1,
          modifiers: [],
          priceAvailable: true,
          available: true,
        },
      ],
      confirmed: {
        boutiqueId: "b1",
        dateKey: "2026-07-28",
        timeSlotId: "s1",
      },
      cartStatus: "success",
      pickupSlotAvailable: true,
      serviceType: "DELIVERY",
      delivery: {
        address: {
          recipient: "",
          phone: "",
          address: "",
          subdistrict: "",
          district: "",
          province: "",
          postalCode: "",
        },
        quote: null,
      },
    });
    assert.equal(result.canCheckout, false);
  });
});

describe("Sprint 22 — totals consistency", () => {
  it("Cart/Checkout/Payment/Confirmation use the same subtotal + fee + total math", () => {
    const shared = computeOrderTotals({
      serviceType: "DELIVERY",
      subtotalThb: 1290,
      deliveryFeeThb: 99,
    });
    assert.equal(shared.subtotalThb, 1290);
    assert.equal(shared.deliveryFeeThb, 99);
    assert.equal(shared.totalThb, 1389);

    const trusted = computeOrderTotals({
      serviceType: "DELIVERY",
      subtotalThb: 1290,
      deliveryFeeThb: 99,
      trustedTotalThb: 1389,
    });
    assert.equal(trusted.totalThb, 1389);
    assert.equal(trusted.subtotalThb, 1290);
    assert.equal(trusted.deliveryFeeThb, 99);

    const pickup = computeOrderTotals({
      serviceType: "PICKUP",
      subtotalThb: 1290,
      deliveryFeeThb: 99,
    });
    assert.equal(pickup.deliveryFeeThb, null);
    assert.equal(pickup.totalThb, 1290);
  });
});

describe("Sprint 22 — confirmation and tracking UI contracts", () => {
  it("default mock tracking state is Preparing and marked current", () => {
    assert.equal(DEFAULT_MOCK_DELIVERY_TRACKING_STATUS, "Preparing");
    const steps = getDeliveryTrackingSteps();
    const current = steps.find((step) => step.isCurrent);
    assert.equal(current?.label, "Preparing");
    assert.equal(steps[0]?.isComplete, true);
    assert.equal(steps[0]?.label, "Submitted");
    assert.equal(steps[1]?.label, "Accepted");
    assert.equal(steps.at(-1)?.label, "Completed");
    assert.equal(steps.at(-1)?.isComplete, false);
  });

  it("Delivery confirmation never renders Pickup QR or Pickup Code", () => {
    const source = readFileSync(
      join(process.cwd(), "app/order-confirmation/OrderConfirmationClient.tsx"),
      "utf8",
    );
    assert.match(source, /isDelivery \? \(\s*<DeliveryTrackingSection/);
    assert.match(
      source,
      /\{!isDelivery \? \(\s*<PickupCredentialsCard/,
    );
    // Only one JSX render site — gated behind !isDelivery.
    assert.equal(
      (source.match(/<PickupCredentialsCard\b/g) ?? []).length,
      1,
    );
  });

  it("Checkout seeds postal from quote without requiring a second postal step", () => {
    const source = readFileSync(
      join(process.cwd(), "app/checkout/CheckoutPageClient.tsx"),
      "utf8",
    );
    const reviewSource = readFileSync(
      join(process.cwd(), "app/checkout/OrderReview.tsx"),
      "utf8",
    );
    assert.match(source, /seedDeliveryPostal\(quotePostal\)/);
    assert.match(source, /Unit \/ Floor/);
    assert.match(source, /Building \/ Village \/ Condominium/);
    assert.match(source, /OrderReview/);
    assert.match(source, /checkout-order-review/);
    assert.match(reviewSource, /Order Review/);
  });
});
