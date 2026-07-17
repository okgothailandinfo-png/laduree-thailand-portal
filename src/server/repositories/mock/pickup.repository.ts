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

function bangkokTodayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: env.timezone });
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

    return {
      boutiqueId: boutique.id,
      dateKey: params.dateKey,
      timezone: env.timezone,
      slots: [...MOCK_PICKUP_SLOTS],
    };
  }

  async findSlotById(id: string): Promise<PickupSlotRecord | null> {
    const slot = MOCK_PICKUP_SLOTS.find((item) => item.id === id);
    if (!slot) return null;
    return {
      id: slot.id,
      boutiqueId: null,
      dateKey: bangkokTodayKey(),
      label: slot.label,
      start: slot.start,
      end: slot.end,
    };
  }
}
