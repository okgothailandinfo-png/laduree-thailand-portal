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

    return {
      boutiqueId: boutique.id,
      dateKey: params.dateKey,
      timezone: env.timezone,
      slots: [...MOCK_PICKUP_SLOTS],
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
    return {
      id: slot.id,
      boutiqueId: null,
      dateKey: "",
      label: slot.label,
      start: slot.start,
      end: slot.end,
    };
  }
}
