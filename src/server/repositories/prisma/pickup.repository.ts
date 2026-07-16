import type { PickupAvailability } from "@/src/server/models/pickup";
import type { PickupRepository } from "@/src/server/repositories/interfaces";
import {
  toDomainPickupAvailability,
  toDomainPickupSlot,
} from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";

/**
 * Available slots: capacity is null (unlimited) or capacity > 0.
 * Reservation counts are not decremented in this sprint.
 */
function isSlotAvailable(capacity: number | null): boolean {
  return capacity === null || capacity > 0;
}

export class PrismaPickupRepository implements PickupRepository {
  async listSlots(): Promise<PickupAvailability["slots"]> {
    const rows = await prisma.pickupSlot.findMany({
      where: {
        OR: [{ capacity: null }, { capacity: { gt: 0 } }],
      },
      orderBy: [{ startTime: "asc" }],
    });

    const seen = new Set<string>();
    return rows
      .filter((row) => isSlotAvailable(row.capacity))
      .map(toDomainPickupSlot)
      .filter((slot) => {
        const key = `${slot.start}-${slot.end}-${slot.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  async getAvailability(params: {
    boutiqueId: string;
    dateKey: string;
  }): Promise<PickupAvailability | null> {
    const boutique = await prisma.boutique.findUnique({
      where: { id: params.boutiqueId },
      select: { id: true },
    });
    if (!boutique) return null;

    const rows = await prisma.pickupSlot.findMany({
      where: {
        boutiqueId: params.boutiqueId,
        dateKey: params.dateKey,
        OR: [{ capacity: null }, { capacity: { gt: 0 } }],
      },
      orderBy: { startTime: "asc" },
    });

    const available = rows.filter((row) => isSlotAvailable(row.capacity));
    return toDomainPickupAvailability(
      params.boutiqueId,
      params.dateKey,
      available,
    );
  }
}
