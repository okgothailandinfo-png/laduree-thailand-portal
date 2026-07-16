import type {
  BoutiqueRepository,
  PickupRepository,
} from "@/src/server/repositories/interfaces";
import type { PickupService } from "@/src/server/services/interfaces";
import { toPickupAvailabilityDto } from "@/src/server/services/mappers";
import type { PickupAvailabilityDto } from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import {
  isDateKey,
  requireString,
} from "@/src/server/utils/validation";

export class DefaultPickupService implements PickupService {
  constructor(
    private readonly pickup: PickupRepository,
    private readonly boutiques: BoutiqueRepository,
  ) {}

  async getAvailability(params: {
    boutiqueId: string;
    dateKey: string;
  }): Promise<PickupAvailabilityDto> {
    const boutiqueId = requireString(params.boutiqueId, "boutiqueId");
    const dateKey = requireString(params.dateKey, "dateKey");

    if (!isDateKey(dateKey)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "dateKey must use YYYY-MM-DD format.",
        { details: { field: "dateKey" } },
      );
    }

    const boutique = await this.boutiques.findById(boutiqueId);
    if (!boutique) {
      throw new AppError("NOT_FOUND", `Boutique not found: ${boutiqueId}`);
    }

    const availability = await this.pickup.getAvailability({
      boutiqueId,
      dateKey,
    });
    if (!availability) {
      throw new AppError(
        "NOT_FOUND",
        "Pickup availability not found for the requested boutique/date.",
      );
    }

    return toPickupAvailabilityDto(availability);
  }
}
