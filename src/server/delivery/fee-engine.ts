import type {
  DeliveryFeeQuote,
  DeliveryFeeQuoteInput,
  DeliveryZone,
} from "@/src/server/models/delivery";

export interface DeliveryFeeEngine {
  quote(input: DeliveryFeeQuoteInput): DeliveryFeeQuote;
  listZones(): readonly DeliveryZone[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePostal(value: string): string {
  return value.trim();
}

function zoneMatchesAddress(
  zone: DeliveryZone,
  input: DeliveryFeeQuoteInput,
): boolean {
  const postal = normalizePostal(input.address.postalCode);
  const province = normalize(input.address.province ?? "");
  const district = normalize(input.address.district ?? "");

  if (zone.postalCodes.length > 0) {
    if (zone.postalCodes.some((code) => normalizePostal(code) === postal)) {
      return true;
    }
  }

  // Province/district matching only when those fields are supplied (full address).
  if (!province && !district) {
    return false;
  }

  if (zone.provinces.length > 0 && zone.districts.length > 0) {
    if (
      zone.provinces.some((p) => normalize(p) === province) &&
      zone.districts.some((d) => normalize(d) === district)
    ) {
      return true;
    }
  } else if (zone.provinces.length > 0) {
    if (zone.provinces.some((p) => normalize(p) === province)) {
      return true;
    }
  } else if (zone.districts.length > 0) {
    if (zone.districts.some((d) => normalize(d) === district)) {
      return true;
    }
  }

  return false;
}

/**
 * Configurable zone-based delivery fee engine.
 * Supports flat-rate today; distance strategy is reserved (returns unsupported).
 * Never invents prices — unmatched or pending rates yield feeMinor: null.
 */
export class ConfigurableDeliveryFeeEngine implements DeliveryFeeEngine {
  constructor(private readonly zones: readonly DeliveryZone[]) {}

  listZones(): readonly DeliveryZone[] {
    return this.zones;
  }

  quote(input: DeliveryFeeQuoteInput): DeliveryFeeQuote {
    const candidates = this.zones.filter((zone) =>
      zoneMatchesAddress(zone, input),
    );

    if (candidates.length === 0) {
      return {
        matched: false,
        zoneId: null,
        strategy: null,
        feeMinor: null,
        boutiqueId: null,
        reason: "NO_ZONE_MATCH",
      };
    }

    const zone = candidates.find((z) => z.isActive) ?? candidates[0];
    if (!zone.isActive) {
      return {
        matched: true,
        zoneId: zone.id,
        strategy: zone.strategy,
        feeMinor: null,
        boutiqueId: zone.boutiqueId ?? null,
        reason: "ZONE_INACTIVE",
      };
    }

    if (zone.strategy === "DISTANCE") {
      // Future distance support — do not invent fees from distanceConfig yet.
      return {
        matched: true,
        zoneId: zone.id,
        strategy: "DISTANCE",
        feeMinor: null,
        boutiqueId: zone.boutiqueId ?? null,
        reason: "DISTANCE_UNSUPPORTED",
      };
    }

    if (zone.flatRateMinor === null) {
      return {
        matched: true,
        zoneId: zone.id,
        strategy: "FLAT_RATE",
        feeMinor: null,
        boutiqueId: zone.boutiqueId ?? null,
        reason: "ZONE_FEE_PENDING",
      };
    }

    return {
      matched: true,
      zoneId: zone.id,
      strategy: "FLAT_RATE",
      feeMinor: zone.flatRateMinor,
      boutiqueId: zone.boutiqueId ?? null,
      reason: "FLAT_RATE",
    };
  }
}

/**
 * Default zone catalog for Thailand foundation.
 * Empty / pending rates only — do not invent Thailand delivery prices.
 * Owner can supply zones via createDeliveryFeeEngine(zones).
 */
export const DEFAULT_DELIVERY_ZONES: readonly DeliveryZone[] = [];

export function createDeliveryFeeEngine(
  zones: readonly DeliveryZone[] = DEFAULT_DELIVERY_ZONES,
): DeliveryFeeEngine {
  return new ConfigurableDeliveryFeeEngine(zones);
}
