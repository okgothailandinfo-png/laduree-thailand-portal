import { env } from "@/src/server/config/env";
import type {
  PickupAvailability,
  PickupSlotRecord,
} from "@/src/server/models/pickup";
import type { PickupRepository } from "@/src/server/repositories/interfaces";
import {
  MOCK_BOUTIQUES,
  MOCK_PICKUP_SLOTS,
} from "@/src/server/repositories/mock/data";
import { AppError } from "@/src/server/utils/errors";

/**
 * Optional finite capacity for mock slots (null = unlimited).
 * Default mock templates are unlimited; tests may seed capacities.
 */
const mockSlotCapacity = new Map<string, number | null>();

export function resetMockPickupCapacities(): void {
  mockSlotCapacity.clear();
}

export function seedMockPickupCapacity(
  slotId: string,
  capacity: number | null,
): void {
  mockSlotCapacity.set(slotId, capacity);
}

function currentCapacity(slotId: string): number | null {
  if (mockSlotCapacity.has(slotId)) {
    return mockSlotCapacity.get(slotId) ?? null;
  }
  return null;
}

export class MockPickupRepository implements PickupRepository {
  async listSlots() {
    return [...MOCK_PICKUP_SLOTS];
  }

  async getAvailability(params: {
    boutiqueId: string;
    dateKey: string;
  }): Promise<PickupAvailability | null> {
    const boutique = MOCK_BOUTIQUES.find((item) => item.id === params.boutiqueId);
    if (!boutique) return null;

    const slots = MOCK_PICKUP_SLOTS.filter((slot) => {
      const capacity = currentCapacity(slot.id);
      return capacity === null || capacity > 0;
    });

    return {
      boutiqueId: boutique.id,
      dateKey: params.dateKey,
      timezone: env.timezone,
      slots,
    };
  }

  /**
   * Mock slots are date-agnostic templates. `dateKey` is intentionally empty so
   * checkout must supply and validate `pickup.dateKey` via getAvailability.
   * Never stamp "today" — that corrupted order pickup dates.
   */
  async findSlotById(id: string): Promise<PickupSlotRecord | null> {
    const slot = MOCK_PICKUP_SLOTS.find((item) => item.id === id);
    if (!slot) return null;
    const capacity = currentCapacity(id);
    if (capacity !== null && capacity <= 0) return null;
    return {
      id: slot.id,
      boutiqueId: null,
      dateKey: "",
      label: slot.label,
      start: slot.start,
      end: slot.end,
    };
  }

  async reserveSlotCapacity(slotId: string): Promise<void> {
    const slot = MOCK_PICKUP_SLOTS.find((item) => item.id === slotId);
    if (!slot) {
      throw new AppError("NOT_FOUND", `Pickup slot not found: ${slotId}`);
    }
    const capacity = currentCapacity(slotId);
    if (capacity === null) return;
    if (capacity <= 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.pickupSlotId is not available for the selected boutique/date.",
        { details: { field: "pickup.pickupSlotId", code: "CAPACITY_EXHAUSTED" } },
      );
    }
    mockSlotCapacity.set(slotId, capacity - 1);
  }

  async releaseSlotCapacity(slotId: string): Promise<void> {
    if (!mockSlotCapacity.has(slotId)) return;
    const capacity = mockSlotCapacity.get(slotId);
    if (capacity === null || capacity === undefined) return;
    mockSlotCapacity.set(slotId, capacity + 1);
  }
}
