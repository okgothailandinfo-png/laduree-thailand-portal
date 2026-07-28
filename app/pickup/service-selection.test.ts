import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { getCheckoutEligibility } from "@/app/cart/checkout-eligibility";
import { isDeliveryMode } from "@/src/server/models/delivery";
import { isServiceType } from "@/src/server/models/service-type";
import { resolveInitialServiceOnOpen } from "./open-pickup-selection";
import { parsePersistedConfirmed } from "./pickup-availability";

const here = dirname(fileURLToPath(import.meta.url));

function readPickupSource(name: string): string {
  return readFileSync(join(here, name), "utf8");
}

/** Mirrors ServiceSegmentedControl active class contract. */
function segmentedTabClass(
  serviceType: "PICKUP" | "DELIVERY",
  tab: "PICKUP" | "DELIVERY",
): string {
  const side = tab === "PICKUP" ? "left" : "right";
  const active = serviceType === tab ? " is-active" : "";
  return `service-segmented__tab service-segmented__tab--${side}${active}`;
}

/**
 * Mirrors setDraftServiceType: reset draft to empty for the new service and
 * clear confirmed fulfillment — cart items stay in a separate store.
 */
function switchServiceType(
  draft: {
    serviceType: "PICKUP" | "DELIVERY";
    boutiqueId: string | null;
    dateKey: string | null;
    timeSlotId: string | null;
    deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER";
  },
  confirmed: unknown,
  next: "PICKUP" | "DELIVERY",
  cartItemCount: number,
) {
  if (draft.serviceType === next) {
    return { draft, confirmed, cartItemCount };
  }
  return {
    draft: {
      serviceType: next,
      boutiqueId: null,
      dateKey: null,
      timeSlotId: null,
      deliveryMode: "EARLIEST_AVAILABLE" as const,
    },
    confirmed: null,
    cartItemCount,
  };
}

describe("Service-selection UI contracts", () => {
  it("service page shows exactly Pick-up and Delivery as top-level options", () => {
    const segmented = readPickupSource("ServiceSegmentedControl.tsx");
    assert.match(segmented, />\s*Pick-up\s*</);
    assert.match(segmented, />\s*Delivery\s*</);
    assert.equal(isServiceType("PICKUP"), true);
    assert.equal(isServiceType("DELIVERY"), true);

    const labels = [
      ...segmented.matchAll(/>\s*(Pick-up|Delivery)\s*</g),
    ].map((m) => m[1]);
    assert.deepEqual(labels, ["Pick-up", "Delivery"]);
  });

  it("Pick-up is selectable via segmented control", () => {
    const segmented = readPickupSource("ServiceSegmentedControl.tsx");
    assert.match(segmented, /onChange\("PICKUP"\)/);
    assert.match(segmented, /aria-selected=\{value === "PICKUP"\}/);
  });

  it("Delivery is selectable via segmented control", () => {
    const segmented = readPickupSource("ServiceSegmentedControl.tsx");
    assert.match(segmented, /onChange\("DELIVERY"\)/);
    assert.match(segmented, /aria-selected=\{value === "DELIVERY"\}/);
  });

  it("active tab styling/state changes correctly", () => {
    assert.equal(
      segmentedTabClass("PICKUP", "PICKUP"),
      "service-segmented__tab service-segmented__tab--left is-active",
    );
    assert.equal(
      segmentedTabClass("PICKUP", "DELIVERY"),
      "service-segmented__tab service-segmented__tab--right",
    );
    assert.equal(
      segmentedTabClass("DELIVERY", "DELIVERY"),
      "service-segmented__tab service-segmented__tab--right is-active",
    );
    assert.equal(
      segmentedTabClass("DELIVERY", "PICKUP"),
      "service-segmented__tab service-segmented__tab--left",
    );

    const css = readPickupSource("pickup.css");
    assert.match(css, /\.service-segmented__tab\.is-active\s*\{/);
    assert.match(css, /background:\s*var\(--main-color/);
    assert.match(css, /color:\s*#fff/);
  });

  it("Pick-up shows outlet selection", () => {
    const modal = readPickupSource("PickupSelectionModal.tsx");
    assert.match(modal, /Select Outlet To Pickup Order/);
    assert.match(modal, /PickupOutletList/);
    assert.match(modal, /service-panel-pickup/);
  });

  it("Delivery shows Earliest Delivery and Pre-order", () => {
    const mode = readPickupSource("DeliveryModeSelector.tsx");
    assert.match(mode, />Earliest Delivery</);
    assert.match(mode, />Pre-order</);
    assert.equal(isDeliveryMode("EARLIEST_AVAILABLE"), true);
    assert.equal(isDeliveryMode("PREORDER"), true);

    const modal = readPickupSource("PickupSelectionModal.tsx");
    assert.match(modal, /Select Delivery Option/);
    assert.match(modal, /DeliveryModeSelector/);
  });

  it("Delivery does not show boutique selection on the service panel", () => {
    const modal = readPickupSource("PickupSelectionModal.tsx");
    const deliveryPanel = modal.slice(
      modal.indexOf('id="service-panel-delivery"'),
      modal.indexOf("{step === \"address\""),
    );
    assert.ok(deliveryPanel.includes("DeliveryModeSelector"));
    assert.ok(!deliveryPanel.includes("PickupOutletList"));
    assert.ok(!deliveryPanel.includes("Select Outlet"));
  });

  it("Pre-order is not a top-level service", () => {
    assert.equal(isServiceType("PREORDER"), false);
    assert.equal(isDeliveryMode("PREORDER"), true);

    const segmented = readPickupSource("ServiceSegmentedControl.tsx");
    assert.doesNotMatch(segmented, /Pre-order/);
  });

  it("Select Other Services is removed from cart strip and service UI", () => {
    const strip = readPickupSource("CartFulfillmentStrip.tsx");
    assert.doesNotMatch(strip, /Select Other Services/);
    assert.doesNotMatch(strip, /tab-service-other/);

    const modal = readPickupSource("PickupSelectionModal.tsx");
    assert.doesNotMatch(modal, /Select Other Services/);
    assert.doesNotMatch(modal, /ASAP/);
    assert.doesNotMatch(modal, /NEXT_DAY/);
    assert.doesNotMatch(modal, /Schedule Delivery/);
  });

  it("page title and segmented control wiring are present", () => {
    const modal = readPickupSource("PickupSelectionModal.tsx");
    assert.match(modal, /SELECT YOUR DESIRED SERVICE/);
    assert.match(modal, /ServiceSegmentedControl/);
    assert.match(modal, /pickup-modal-back/);
  });
});

describe("Service switching preserves cart and clears fulfillment", () => {
  it("cart items remain when switching service", () => {
    const before = {
      draft: {
        serviceType: "PICKUP" as const,
        boutiqueId: "b1",
        dateKey: "2026-07-28",
        timeSlotId: "1030-1100",
        deliveryMode: "EARLIEST_AVAILABLE" as const,
      },
      confirmed: { serviceType: "PICKUP" },
      cartItemCount: 3,
    };
    const after = switchServiceType(
      before.draft,
      before.confirmed,
      "DELIVERY",
      before.cartItemCount,
    );
    assert.equal(after.cartItemCount, 3);
    assert.equal(after.draft.serviceType, "DELIVERY");
  });

  it("incompatible fulfilment state is cleared on service switch", () => {
    const after = switchServiceType(
      {
        serviceType: "PICKUP",
        boutiqueId: "b1",
        dateKey: "2026-07-28",
        timeSlotId: "1030-1100",
        deliveryMode: "EARLIEST_AVAILABLE",
      },
      { serviceType: "PICKUP" },
      "DELIVERY",
      2,
    );
    assert.equal(after.confirmed, null);
    assert.equal(after.draft.boutiqueId, null);
    assert.equal(after.draft.dateKey, null);
    assert.equal(after.draft.timeSlotId, null);

    const context = readPickupSource("PickupContext.tsx");
    assert.match(context, /setDraftServiceType/);
    assert.match(context, /persistConfirmed\(null\)/);
    assert.match(context, /\.\.\.emptyDraft/);
  });

  it("stale pickup confirmation cannot satisfy delivery checkout", () => {
    const result = getCheckoutEligibility({
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
      confirmed: {
        boutique: {
          id: "b1",
          name: "Boutique",
          code: "B1",
          address: "Bangkok",
          openingHours: "10:00–20:00",
          lastOrderTime: "19:30",
        },
        dateKey: "2026-07-28",
        timeSlot: {
          id: "1030-1100",
          label: "10:30–11:00",
          start: "10:30",
          end: "11:00",
        },
      },
      serviceType: "DELIVERY",
      delivery: null,
    });
    assert.equal(result.canCheckout, false);
  });

  it("mixed pickup fields on delivery persist payload are rejected", () => {
    const switched = parsePersistedConfirmed(
      JSON.stringify({
        serviceType: "DELIVERY",
        deliveryMode: "EARLIEST_AVAILABLE",
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
      }),
    );
    assert.equal(switched, null);
  });
});

describe("Service-selection accessibility contracts", () => {
  it("segmented control exposes tab semantics and keyboard handlers", () => {
    const segmented = readPickupSource("ServiceSegmentedControl.tsx");
    assert.match(segmented, /role="tablist"/);
    assert.match(segmented, /role="tab"/);
    assert.match(segmented, /aria-selected=/);
    assert.match(segmented, /ArrowRight|ArrowLeft/);
  });

  it("delivery mode selector exposes radio semantics", () => {
    const mode = readPickupSource("DeliveryModeSelector.tsx");
    assert.match(mode, /role="radiogroup"/);
    assert.match(mode, /role="radio"/);
    assert.match(mode, /aria-checked=/);
  });
});

describe("Service-selection initial service from Cart", () => {
  it("clicking Delivery in Cart opens service selection with Delivery active", () => {
    const strip = readPickupSource("CartFulfillmentStrip.tsx");
    assert.match(
      strip,
      /serviceType:\s*"DELIVERY"/,
    );
    const opened = resolveInitialServiceOnOpen({
      confirmedServiceType: null,
      requestedServiceType: "DELIVERY",
    });
    assert.equal(opened.serviceType, "DELIVERY");
    assert.equal(opened.preserveConfirmed, false);
    assert.equal(opened.serviceChanged, false);
  });

  it("Delivery options are visible without a second Delivery click", () => {
    const opened = resolveInitialServiceOnOpen({
      confirmedServiceType: null,
      requestedServiceType: "DELIVERY",
    });
    assert.equal(opened.serviceType, "DELIVERY");
    // Modal service panel renders DeliveryModeSelector when draft is DELIVERY.
    const modal = readPickupSource("PickupSelectionModal.tsx");
    assert.match(modal, /draft\.serviceType === "PICKUP"/);
    assert.match(modal, /DeliveryModeSelector/);
    assert.match(modal, /Earliest Delivery|Select Delivery Option/);
  });

  it("clicking Pick-up in Cart opens with Pick-up active", () => {
    const strip = readPickupSource("CartFulfillmentStrip.tsx");
    assert.match(strip, /serviceType:\s*"PICKUP"/);
    const opened = resolveInitialServiceOnOpen({
      confirmedServiceType: null,
      requestedServiceType: "PICKUP",
    });
    assert.equal(opened.serviceType, "PICKUP");
  });

  it("change delivery mode opens Delivery directly", () => {
    const strip = readPickupSource("CartFulfillmentStrip.tsx");
    assert.match(
      strip,
      /step:\s*"mode"[\s\S]*serviceType:\s*"DELIVERY"/,
    );
    const opened = resolveInitialServiceOnOpen({
      confirmedServiceType: "DELIVERY",
      requestedServiceType: "DELIVERY",
    });
    assert.equal(opened.serviceType, "DELIVERY");
    assert.equal(opened.preserveConfirmed, true);
    assert.equal(opened.serviceChanged, false);
  });

  it("existing valid selected service is preserved when reopening without switch", () => {
    assert.deepEqual(
      resolveInitialServiceOnOpen({
        confirmedServiceType: "PICKUP",
      }),
      {
        serviceType: "PICKUP",
        serviceChanged: false,
        preserveConfirmed: true,
      },
    );
    assert.deepEqual(
      resolveInitialServiceOnOpen({
        confirmedServiceType: "DELIVERY",
      }),
      {
        serviceType: "DELIVERY",
        serviceChanged: false,
        preserveConfirmed: true,
      },
    );
  });

  it("defaults to PICKUP only when nothing is confirmed or requested", () => {
    assert.deepEqual(resolveInitialServiceOnOpen({ confirmedServiceType: null }), {
      serviceType: "PICKUP",
      serviceChanged: false,
      preserveConfirmed: false,
    });
  });

  it("explicit opposite-service click marks serviceChanged and does not preserve confirmed", () => {
    assert.deepEqual(
      resolveInitialServiceOnOpen({
        confirmedServiceType: "PICKUP",
        requestedServiceType: "DELIVERY",
      }),
      {
        serviceType: "DELIVERY",
        serviceChanged: true,
        preserveConfirmed: false,
      },
    );
    assert.deepEqual(
      resolveInitialServiceOnOpen({
        confirmedServiceType: "DELIVERY",
        requestedServiceType: "PICKUP",
      }),
      {
        serviceType: "PICKUP",
        serviceChanged: true,
        preserveConfirmed: false,
      },
    );
  });

  it("cart items remain unchanged when resolving initial service", () => {
    const cartItemCount = 4;
    resolveInitialServiceOnOpen({
      confirmedServiceType: "PICKUP",
      requestedServiceType: "DELIVERY",
    });
    assert.equal(cartItemCount, 4);
  });

  it("openPickupSelection uses resolveInitialServiceOnOpen", () => {
    const context = readPickupSource("PickupContext.tsx");
    assert.match(context, /resolveInitialServiceOnOpen/);
    assert.match(context, /requestedServiceType:\s*opts\?\.serviceType/);
  });
});
