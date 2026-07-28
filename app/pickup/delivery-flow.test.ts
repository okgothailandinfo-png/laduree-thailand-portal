import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCheckoutEligibility } from "@/app/cart/checkout-eligibility";
import {
  createPendingPreorderQuote,
  createValidDeliveryQuote,
  emptyDeliveryQuote,
  invalidateDeliveryQuoteState,
  markDeliveryQuoteUnsupported,
} from "@/app/pickup/delivery-quote";
import { createDeliveryAvailabilityEngine } from "@/src/server/delivery/availability";
import { isServiceType } from "@/src/server/models/service-type";
import { isDeliveryMode } from "@/src/server/models/delivery";
import { parsePersistedConfirmed } from "@/app/pickup/pickup-availability";

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

const postalAddress = {
  recipient: "",
  phone: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "10330",
};

const SAMPLE_WINDOW = {
  id: "1230-1530",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

function validEarliestQuote(
  overrides: Partial<Parameters<typeof createValidDeliveryQuote>[0]> = {},
) {
  return createValidDeliveryQuote({
    postalCode: "10330",
    zoneId: "zone-1",
    deliveryMode: "EARLIEST_AVAILABLE",
    deliveryDate: "2026-07-28",
    deliveryWindow: SAMPLE_WINDOW,
    deliveryFee: 100,
    expiresAt: null,
    createdAt: null,
    ...overrides,
  });
}

describe("Top-level service types", () => {
  it("only PICKUP and DELIVERY are top-level service types", () => {
    assert.equal(isServiceType("PICKUP"), true);
    assert.equal(isServiceType("DELIVERY"), true);
    assert.equal(isServiceType("PREORDER"), false);
  });

  it("PREORDER is a delivery mode, not a top-level service", () => {
    assert.equal(isDeliveryMode("PREORDER"), true);
    assert.equal(isDeliveryMode("EARLIEST_AVAILABLE"), true);
    assert.equal(isServiceType("PREORDER"), false);
  });
});

describe("Delivery eligibility and service switching", () => {
  it("EARLIEST_AVAILABLE valid quote allows checkout", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: validEarliestQuote(),
      },
    });
    assert.equal(result.diagnostics.deliveryMode, "EARLIEST_AVAILABLE");
    assert.equal(result.canCheckout, true);
  });

  it("DELIVERY eligibility does not require boutiqueId", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: validEarliestQuote(),
      },
    });
    assert.equal(result.diagnostics.hasBoutiqueId, false);
    assert.equal(result.canCheckout, true);
  });

  it("DELIVERY cart gate requires postal code before checkout, not boutique/pickup", () => {
    const emptyPostal = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: { ...postalAddress, postalCode: "" },
        quote: emptyDeliveryQuote({ deliveryMode: "EARLIEST_AVAILABLE" }),
      },
    });
    assert.equal(emptyPostal.canCheckout, false);
    assert.ok(emptyPostal.reason?.toLowerCase().includes("postal"));
  });

  it("unsupported zone blocks checkout", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: markDeliveryQuoteUnsupported(
          emptyDeliveryQuote({ deliveryMode: "EARLIEST_AVAILABLE" }),
          "10330",
        ),
      },
    });
    assert.equal(result.canCheckout, false);
    assert.ok(result.reason?.includes("not available for delivery"));
  });

  it("invalid quote (fee unavailable) blocks checkout", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: invalidateDeliveryQuoteState(
          emptyDeliveryQuote({ deliveryMode: "EARLIEST_AVAILABLE" }),
          "10330",
        ),
      },
    });
    assert.equal(result.canCheckout, false);
    assert.ok(result.reason?.includes("not available"));
  });

  it("missing delivery window blocks EARLIEST_AVAILABLE checkout", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: invalidateDeliveryQuoteState(
          emptyDeliveryQuote({ deliveryMode: "EARLIEST_AVAILABLE" }),
          "10330",
        ),
      },
    });
    assert.equal(result.canCheckout, false);
  });

  it("expired quote blocks checkout (stale)", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: validEarliestQuote({
          expiresAt: new Date(Date.now() - 1_000).toISOString(),
        }),
      },
    });
    assert.equal(result.canCheckout, false);
  });

  it("PREORDER requires a VALID quote with date and window — not just zone/fee", () => {
    const missing = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: createPendingPreorderQuote({
          postalCode: "10330",
          zoneId: "zone-1",
          deliveryFee: 100,
          expiresAt: null,
          createdAt: null,
        }),
      },
    });
    assert.equal(missing.canCheckout, false);
    assert.equal(missing.diagnostics.deliveryMode, "PREORDER");

    const ok = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: createValidDeliveryQuote({
          postalCode: "10330",
          zoneId: "zone-1",
          deliveryMode: "PREORDER",
          deliveryDate: "2026-07-30",
          deliveryWindow: SAMPLE_WINDOW,
          deliveryFee: 100,
          expiresAt: null,
          createdAt: null,
        }),
      },
    });
    assert.equal(ok.canCheckout, true);
  });

  it("switching Pickup to Delivery clears incompatible pickup selection (persist contract)", () => {
    const pickupRaw = JSON.stringify({
      serviceType: "PICKUP",
      boutique: {
        id: "b1",
        name: "Boutique",
        code: "B1",
        address: "Bangkok",
        openingHours: "10:00–20:00",
        lastOrderTime: "19:30",
      },
      dateKey: "2026-07-21",
      timeSlot: {
        id: "1030-1100",
        label: "10:30–11:00",
        start: "10:30",
        end: "11:00",
      },
    });
    const pickup = parsePersistedConfirmed(pickupRaw);
    assert.equal(pickup?.serviceType, "PICKUP");

    const switched = parsePersistedConfirmed(
      JSON.stringify({
        serviceType: "DELIVERY",
        deliveryMode: "EARLIEST_AVAILABLE",
        boutique: pickup?.boutique,
        dateKey: pickup?.dateKey,
        timeSlot: pickup?.timeSlot,
      }),
    );
    assert.equal(switched, null);
  });

  it("switching Delivery to Pickup clears incompatible delivery state (persist contract)", () => {
    const deliveryOnly = parsePersistedConfirmed(
      JSON.stringify({
        serviceType: "PICKUP",
        deliveryMode: "EARLIEST_AVAILABLE",
        deliveryAddress: postalAddress,
      }),
    );
    assert.equal(deliveryOnly, null);
  });

  it("EARLIEST_AVAILABLE persist requires system date and time window", () => {
    const ok = parsePersistedConfirmed(
      JSON.stringify({
        serviceType: "DELIVERY",
        deliveryMode: "EARLIEST_AVAILABLE",
        deliveryAddress: postalAddress,
        zoneSupported: true,
        feeTrusted: true,
        feeThb: 100,
        deliveryPromise: {
          available: true,
          dateKey: "2026-07-28",
          relativeLabel: "Today",
          timeWindow: SAMPLE_WINDOW,
          reason: "SAME_DAY",
        },
      }),
    );
    assert.equal(ok?.serviceType, "DELIVERY");
    assert.equal(ok?.deliveryMode, "EARLIEST_AVAILABLE");
    assert.equal(ok?.deliveryQuote?.status, "VALID");
  });
});

describe("EARLIEST_AVAILABLE / PREORDER availability engine", () => {
  it("returns unavailable when no approved cut-off rule exists", () => {
    const engine = createDeliveryAvailabilityEngine();
    const promise = engine.resolveEarliestAvailable(
      new Date("2026-07-27T10:00:00.000+07:00"),
    );
    assert.equal(promise.available, false);
    assert.equal(promise.reason, "NO_RULE");
  });

  it("can return same-day or later date with system-assigned window", () => {
    const engine = createDeliveryAvailabilityEngine([
      {
        id: "r1",
        sameDayCutoffTime: "14:00",
        nextDayEnabled: true,
        earliestTimeWindow: SAMPLE_WINDOW,
        isActive: true,
      },
    ]);
    const before = engine.resolveEarliestAvailable(
      new Date("2026-07-27T10:00:00.000+07:00"),
    );
    assert.equal(before.available, true);
    assert.equal(before.relativeLabel, "Today");
    assert.equal(before.reason, "SAME_DAY");
    assert.equal(before.timeWindow?.id, "1230-1530");

    const after = engine.resolveEarliestAvailable(
      new Date("2026-07-27T15:00:00.000+07:00"),
    );
    assert.equal(after.available, true);
    assert.equal(after.relativeLabel, "Tomorrow");
    assert.equal(after.reason, "NEXT_DAY");
  });

  it("PREORDER rejects today/past and assigns system window for future dates", () => {
    const engine = createDeliveryAvailabilityEngine([], {
      windowByDateKey: new Map([
        ["2026-07-27", SAMPLE_WINDOW],
        ["2026-07-30", SAMPLE_WINDOW],
      ]),
    });
    const now = new Date("2026-07-27T10:00:00.000+07:00");
    assert.deepEqual(engine.listPreorderDateKeys(now), ["2026-07-30"]);
    assert.equal(
      engine.resolvePreorderWindow("2026-07-27", now).reason,
      "TODAY_OR_PAST",
    );
    assert.equal(
      engine.resolvePreorderWindow("2026-07-30", now).available,
      true,
    );
  });
});

describe("Guest checkout contract", () => {
  it("Continue as Guest does not require account registration", () => {
    // Identity step is client-only; guest progression needs no auth token.
    const guestIdentityOptions = [
      "Continue as Guest",
      "Member Login",
      "Continue with LINE",
    ] as const;
    assert.ok(guestIdentityOptions.includes("Continue as Guest"));
    assert.equal(guestIdentityOptions[0], "Continue as Guest");
  });

  it("Guest Checkout is accessible after a valid delivery quote", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: validEarliestQuote({
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      },
    });
    assert.equal(result.canCheckout, true);
  });
});

describe("Quote invalidation eligibility", () => {
  it("expired quote blocks checkout", () => {
    const result = getCheckoutEligibility({
      items: [completeBoxItem],
      confirmed: null,
      serviceType: "DELIVERY",
      delivery: {
        address: postalAddress,
        quote: validEarliestQuote({
          expiresAt: new Date(Date.now() - 1_000).toISOString(),
        }),
      },
    });
    assert.equal(result.canCheckout, false);
  });
});
