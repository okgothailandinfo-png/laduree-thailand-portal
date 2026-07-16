import { env } from "@/src/server/config/env";
import type { PickupAvailability } from "@/src/server/models/pickup";
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
}
