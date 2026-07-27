/**
 * Delivery domain types for Sprint 21 foundation.
 * Fees and zone rates must come from owner-approved configuration — never invent prices.
 */

export type DeliveryAddress = {
  recipient: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

/** Confirmed delivery window (date + time), parallel to pickup slot selection. */
export type DeliverySlotSelection = {
  dateKey: string;
  timeSlotId: string;
  timeSlotLabel: string;
};

/**
 * Order-level delivery snapshot.
 * Fulfilling boutique + slot remain on Order.pickup for kitchen board reuse.
 */
export type OrderDelivery = {
  address: DeliveryAddress;
  /**
   * Delivery fee in satang (minor units).
   * Null when no owner-approved zone/flat rate matches — never invent a price.
   */
  feeMinor: number | null;
  /** Zone id that produced the fee quote, when matched. */
  zoneId?: string | null;
  feeStrategy?: DeliveryFeeStrategy | null;
};

export type DeliveryFeeStrategy = "FLAT_RATE" | "DISTANCE";

/** Configurable delivery zone. Rates are optional until owner-approved. */
export type DeliveryZone = {
  id: string;
  name: string;
  /** Matching postal codes (exact). Empty = no postal match. */
  postalCodes: string[];
  /** Matching province names (case-insensitive trim). */
  provinces: string[];
  /** Matching district names (case-insensitive trim). */
  districts: string[];
  /** Preferred fulfilling boutique when this zone matches. */
  boutiqueId?: string | null;
  strategy: DeliveryFeeStrategy;
  /**
   * Flat-rate fee in satang. Null = zone matches but fee not yet approved.
   * Never invent a fallback price.
   */
  flatRateMinor: number | null;
  /**
   * Reserved for future distance-based pricing (meters / km bands).
   * Not used by the flat-rate engine in this sprint.
   */
  distanceConfig?: DeliveryDistanceConfig | null;
  isActive: boolean;
};

export type DeliveryDistanceConfig = {
  /** Base fee in satang when distance pricing is enabled. Null until approved. */
  baseFeeMinor: number | null;
  /** Additional fee per kilometer in satang. Null until approved. */
  perKmMinor: number | null;
  /** Maximum deliverable distance in meters. Null = unrestricted (when enabled). */
  maxDistanceMeters: number | null;
};

export type DeliveryFeeQuoteInput = {
  address: DeliveryAddress;
  /** Optional distance in meters for future DISTANCE strategy. */
  distanceMeters?: number | null;
};

export type DeliveryFeeQuote = {
  matched: boolean;
  zoneId: string | null;
  strategy: DeliveryFeeStrategy | null;
  /**
   * Fee in satang. Null when unmatched or when the matched zone has no approved rate.
   */
  feeMinor: number | null;
  boutiqueId: string | null;
  reason:
    | "FLAT_RATE"
    | "DISTANCE_UNSUPPORTED"
    | "ZONE_FEE_PENDING"
    | "NO_ZONE_MATCH"
    | "ZONE_INACTIVE";
};
