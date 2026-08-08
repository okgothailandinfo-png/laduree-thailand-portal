import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFulfillmentTrackingSteps,
  mapOrderStatusToFulfillmentLabel,
} from "@/lib/orders/fulfillment-status";

describe("Sprint 25 — fulfillment status labels (SG samples)", () => {
  it("maps pickup ready_for_pickup to Ready For Collection", () => {
    assert.equal(
      mapOrderStatusToFulfillmentLabel("ready_for_pickup", "PICKUP"),
      "Ready For Collection",
    );
  });

  it("maps delivery preparing to Preparing with Submitted/Accepted before it", () => {
    assert.equal(
      mapOrderStatusToFulfillmentLabel("preparing", "DELIVERY"),
      "Preparing",
    );
    const steps = getFulfillmentTrackingSteps("DELIVERY", "Preparing");
    assert.equal(steps[0]?.label, "Submitted");
    assert.equal(steps[0]?.isComplete, true);
    assert.equal(steps[1]?.label, "Accepted");
    assert.equal(steps[2]?.isCurrent, true);
  });
});
