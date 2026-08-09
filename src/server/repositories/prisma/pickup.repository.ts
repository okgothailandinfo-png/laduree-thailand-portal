import type {
  PickupAvailability,
  PickupSlotRecord,
} from "@/src/server/models/pickup";
import type { PickupRepository } from "@/src/server/repositories/interfaces";
import {
  toDomainPickupAvailability,
  toDomainPickupSlot,
} from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";

/**
 * Available slots: capacity is null (unlimited) or capacity > 0.
 * Finite capacity is decremented via reserveSlotCapacity on checkout.
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

  async findSlotById(id: string): Promise<PickupSlotRecord | null> {
    const row = await prisma.pickupSlot.findUnique({ where: { id } });
    if (!row || !isSlotAvailable(row.capacity)) return null;
    return {
      id: row.id,
      boutiqueId: row.boutiqueId,
      dateKey: row.dateKey,
      label: row.label,
      start: row.startTime,
      end: row.endTime,
    };
  }

  async reserveSlotCapacity(slotId: string): Promise<void> {
    const row = await prisma.pickupSlot.findUnique({ where: { id: slotId } });
    if (!row) {
      throw new AppError("NOT_FOUND", `Pickup slot not found: ${slotId}`);
    }
    if (row.capacity === null) {
      return;
    }
    const updated = await prisma.pickupSlot.updateMany({
      where: { id: slotId, capacity: { gt: 0 } },
      data: { capacity: { decrement: 1 } },
    });
    if (updated.count === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.pickupSlotId is not available for the selected boutique/date.",
        { details: { field: "pickup.pickupSlotId", code: "CAPACITY_EXHAUSTED" } },
      );
    }
  }

  async releaseSlotCapacity(slotId: string): Promise<void> {
    const row = await prisma.pickupSlot.findUnique({ where: { id: slotId } });
    if (!row || row.capacity === null) return;
    await prisma.pickupSlot.update({
      where: { id: slotId },
      data: { capacity: { increment: 1 } },
    });
  }
}
