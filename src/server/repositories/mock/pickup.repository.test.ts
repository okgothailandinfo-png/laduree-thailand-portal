import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockPickupRepository } from "@/src/server/repositories/mock/pickup.repository";
import { MOCK_PICKUP_SLOTS } from "@/src/server/repositories/mock/data";

describe("MockPickupRepository findSlotById", () => {
  it("does not stamp today's dateKey onto template slots", async () => {
    const repo = new MockPickupRepository();
    const slotId = MOCK_PICKUP_SLOTS[0]?.id;
    assert.ok(slotId);
    const slot = await repo.findSlotById(slotId);
    assert.ok(slot);
    assert.equal(slot.dateKey, "");
    assert.equal(slot.boutiqueId, null);
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
    });
    assert.notEqual(slot.dateKey, today);
  });

  it("returns availability for the requested dateKey", async () => {
    const repo = new MockPickupRepository();
    const availability = await repo.getAvailability({
      boutiqueId: "boutique-pending",
      dateKey: "2026-07-25",
    });
    assert.ok(availability);
    assert.equal(availability?.dateKey, "2026-07-25");
    assert.ok(availability?.slots.some((slot) => slot.id === "1030-1100"));
  });
});
