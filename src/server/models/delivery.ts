/**
 * Delivery domain types for Sprint 21.
 * Fees, zones, and availability cut-offs must be owner-approved — never invent.
 *
 * Top-level customer services: PICKUP | DELIVERY only.
 * Delivery modes (inside DELIVERY): EARLIEST_AVAILABLE | PREORDER.
 */

export type DeliveryMode = "EARLIEST_AVAILABLE" | "PREORDER";

export const DELIVERY_MODES = ["EARLIEST_AVAILABLE", "PREORDER"] as const;

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return value === "EARLIEST_AVAILABLE" || value === "PREORDER";
}

/** Customer-facing labels for delivery modes. */
export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  EARLIEST_AVAILABLE: "Earliest Delivery",
  PREORDER: "Pre-order",
};

export type DeliveryAddress = {
  recipient: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  /** Optional Building / Village / Condominium. */
  building?: string;
  /** Optional Unit / Floor — separate from building. */
  unitFloor?: string;
  /** Optional delivery notes / additional request. */
  notes?: string;
};

/** System-assigned delivery time window (customer never selects a slot). */
export type DeliveryTimeWindow = {
  id: string;
  label: string;
  start: string;
  end: string;
};

/**
 * Order-level delivery snapshot.
 * Customer never selects a boutique; fulfilmentBoutiqueId is internal only.
 */
export type OrderDelivery = {
  mode: DeliveryMode;
  address: DeliveryAddress;
  /**
   * Delivery fee in satang (minor units).
   * Null when unmatched or fee pending — checkout must reject null fees.
   */
  feeMinor: number | null;
  zoneId?: string | null;
  feeStrategy?: DeliveryFeeStrategy | null;
  /**
   * System-calculated (EARLIEST_AVAILABLE) or customer-selected future date (PREORDER).
   * YYYY-MM-DD Asia/Bangkok.
   */
  dateKey: string | null;
  /** System-assigned window id — never customer-selected. */
  timeSlotId?: string | null;
  timeSlotLabel?: string | null;
  /** Customer-facing relative label for earliest (Today / Tomorrow). */
  promiseRelativeLabel?: "Today" | "Tomorrow" | null;
  /**
   * Internal dispatch / fulfilment boutique — never customer-selected.
   * Null until zone/ops assignment supplies one; never hard-code a store.
   */
  fulfilmentBoutiqueId?: string | null;
};

export type DeliveryFeeStrategy = "FLAT_RATE" | "DISTANCE";

/** Configurable delivery zone. Rates are optional until owner-approved. */
export type DeliveryZone = {
  id: string;
  name: string;
  postalCodes: string[];
  provinces: string[];
  districts: string[];
  /** Internal fulfilment boutique when this zone matches — not shown to customer. */
  boutiqueId?: string | null;
  strategy: DeliveryFeeStrategy;
  flatRateMinor: number | null;
  distanceConfig?: DeliveryDistanceConfig | null;
  isActive: boolean;
};

export type DeliveryDistanceConfig = {
  baseFeeMinor: number | null;
  perKmMinor: number | null;
  maxDistanceMeters: number | null;
};

export type DeliveryFeeQuoteInput = {
  address: Pick<DeliveryAddress, "postalCode"> &
    Partial<
      Pick<DeliveryAddress, "province" | "district" | "subdistrict" | "address">
    >;
  distanceMeters?: number | null;
};

export type DeliveryFeeQuote = {
  matched: boolean;
  zoneId: string | null;
  strategy: DeliveryFeeStrategy | null;
  feeMinor: number | null;
  /** Internal fulfilment boutique from zone config, if any. */
  boutiqueId: string | null;
  reason:
    | "FLAT_RATE"
    | "DISTANCE_UNSUPPORTED"
    | "ZONE_FEE_PENDING"
    | "NO_ZONE_MATCH"
    | "ZONE_INACTIVE";
};

/**
 * Owner-approved EARLIEST_AVAILABLE rule.
 * Missing / null cut-off or window → system must not invent a promise (unavailable).
 */
export type DeliveryAvailabilityRule = {
  id: string;
  /**
   * Asia/Bangkok HH:mm same-day cut-off.
   * Null = cut-off not approved — earliest promise unavailable.
   */
  sameDayCutoffTime: string | null;
  /** When true and past cut-off (or same-day blocked), allow next calendar day. */
  nextDayEnabled: boolean;
  /**
   * System-assigned delivery window for earliest-available promises.
   * Null = window not approved — promise unavailable.
   */
  earliestTimeWindow: DeliveryTimeWindow | null;
  isActive: boolean;
};

/**
 * Optional Pre-order catalog: future dateKey → system-assigned window.
 * Empty map → PREORDER UI shows unavailable (do not invent dates/windows).
 * Today and past dates must not appear.
 */
export type DeliveryPreorderConfig = {
  windowByDateKey: ReadonlyMap<string, DeliveryTimeWindow>;
};

export type DeliveryPromise = {
  available: boolean;
  dateKey: string | null;
  relativeLabel: "Today" | "Tomorrow" | null;
  timeWindow: DeliveryTimeWindow | null;
  reason:
    | "SAME_DAY"
    | "NEXT_DAY"
    | "LATER_DATE"
    | "NO_RULE"
    | "RULE_INACTIVE"
    | "CUTOFF_PENDING"
    | "WINDOW_PENDING";
};

export type DeliveryPreorderResolution = {
  available: boolean;
  dateKey: string | null;
  timeWindow: DeliveryTimeWindow | null;
  reason:
    | "OK"
    | "NO_CATALOG"
    | "DATE_NOT_AVAILABLE"
    | "TODAY_OR_PAST"
    | "WINDOW_PENDING";
};
