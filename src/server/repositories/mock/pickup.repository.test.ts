import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MockPickupRepository,
  resetMockPickupCapacities,
  seedMockPickupCapacity,
} from "@/src/server/repositories/mock/pickup.repository";
import { MOCK_PICKUP_SLOTS } from "@/src/server/repositories/mock/data";
import { AppError } from "@/src/server/utils/errors";

describe("MockPickupRepository findSlotById", () => {
  it("does not stamp today's dateKey onto template slots", async () => {
    resetMockPickupCapacities();
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
    resetMockPickupCapacities();
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

describe("Sprint 30 — MockPickupRepository capacity", () => {
  it("decrements finite capacity and hides exhausted slots", async () => {
    resetMockPickupCapacities();
    seedMockPickupCapacity("1030-1100", 1);
    const repo = new MockPickupRepository();

    await repo.reserveSlotCapacity("1030-1100");
    const exhausted = await repo.findSlotById("1030-1100");
    assert.equal(exhausted, null);

    await assert.rejects(
      () => repo.reserveSlotCapacity("1030-1100"),
      (error: unknown) => {
        if (!(error instanceof AppError) || error.code !== "VALIDATION_ERROR") {
          return false;
        }
        const details = error.details as { code?: string } | undefined;
        return details?.code === "CAPACITY_EXHAUSTED";
      },
    );

    await repo.releaseSlotCapacity("1030-1100");
    const restored = await repo.findSlotById("1030-1100");
    assert.ok(restored);
  });

  it("treats unset capacity as unlimited", async () => {
    resetMockPickupCapacities();
    const repo = new MockPickupRepository();
    await repo.reserveSlotCapacity("1030-1100");
    await repo.reserveSlotCapacity("1030-1100");
    const slot = await repo.findSlotById("1030-1100");
    assert.ok(slot);
  });
});
