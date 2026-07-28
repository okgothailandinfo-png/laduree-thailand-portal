import type { Boutique, PickupTimeSlot } from "@/lib/api/types";
import {
  createPendingPreorderQuote,
  createValidDeliveryQuote,
  emptyDeliveryQuote,
  invalidateDeliveryQuoteState,
  markDeliveryQuoteUnsupported,
  parsePersistedDeliveryQuote,
  type DeliveryQuote,
} from "./delivery-quote";

export const PICKUP_CONFIRMED_STORAGE_KEY = "laduree.pickup.confirmed.v1";

export type FulfillmentServiceType = "PICKUP" | "DELIVERY";
export type DeliveryModeClient = "EARLIEST_AVAILABLE" | "PREORDER";

export type DeliveryAddressDraft = {
  recipient: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  building?: string;
  notes?: string;
};

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddressDraft = {
  recipient: "",
  phone: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  building: "",
  notes: "",
};

export const PICKUP_MESSAGES = {
  missingBoutique: "Please select a pickup boutique first.",
  noDates: "No pickup dates available.",
  noSlots: "No pickup times are available for this date.",
  datesFailed: "Failed to load availability.",
  slotsFailed: "Failed to load availability.",
  staleDate:
    "Your previously selected pickup date is no longer available. Please choose another date.",
  staleSlot:
    "Your previously selected pickup time is no longer available. Please choose another time.",
  checkoutStaleSlot:
    "Your selected pickup time is no longer available. Please choose another time.",
} as const;

export const DELIVERY_MESSAGES = {
  postalRequired: "The Postal Code field is required.",
  enterPostalInCart:
    "Enter your postal code in the cart to check delivery availability.",
  addressIncomplete: "Wrong postal code or address",
  addressUnavailable:
    "The postal / address is not available for delivery yet.",
  unavailable: "Delivery is not available at this time.",
  quoteExpired: "Delivery quote expired. Please recalculate delivery.",
  noPreorderDates: "Delivery is not available at this time.",
  noPreorderWindow: "Delivery is not available at this time.",
  /** @deprecated alias */
  noScheduledDates: "Delivery is not available at this time.",
  /** @deprecated alias */
  noScheduledSlots: "Delivery is not available at this time.",
} as const;

export type DeliveryPromiseDraft = {
  available: boolean;
  dateKey: string | null;
  relativeLabel: "Today" | "Tomorrow" | null;
  timeWindow: {
    id: string;
    label: string;
    start: string;
    end: string;
  } | null;
  reason: string;
};

export type PersistedConfirmedPickup = {
  serviceType?: FulfillmentServiceType;
  deliveryMode?: DeliveryModeClient;
  boutique?: {
    id: string;
    name: string;
    code: string;
    address: string;
    openingHours: string;
    lastOrderTime: string;
  };
  dateKey?: string;
  timeSlot?: PickupTimeSlot;
  deliveryAddress?: DeliveryAddressDraft;
  /** Authoritative delivery quote — single source of truth. */
  deliveryQuote?: DeliveryQuote;
  /** @deprecated Legacy fields kept for migrating older sessionStorage payloads only. */
  deliveryPromise?: DeliveryPromiseDraft;
  /** @deprecated */
  zoneSupported?: boolean;
  /** @deprecated */
  feeTrusted?: boolean;
  /** @deprecated */
  feeThb?: number | null;
  /** @deprecated */
  quoteFresh?: boolean;
  /** @deprecated */
  quoteToken?: string | null;
  /** @deprecated */
  quoteCreatedAt?: string | null;
  /** @deprecated */
  quoteExpiresAt?: string | null;
  /** @deprecated */
  zoneId?: string | null;
};

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

export function hasValidDeliveryPostalCode(postalCode: string): boolean {
  return /^\d{5}$/.test(postalCode.trim());
}

/**
 * Editable postal-code field normalization.
 * Digits only, max 5 — does not auto-submit or fetch availability.
 */
export function normalizeDeliveryPostalInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 5);
}

/**
 * Whether a typed postal value should clear a previously validated delivery quote.
 * Availability is not fetched here — callers invalidate local quote state only.
 */
export function shouldInvalidateDeliveryQuoteForPostalChange(input: {
  previousPostal: string;
  nextPostal: string;
  hasTrustedQuote: boolean;
}): boolean {
  if (!input.hasTrustedQuote) {
    return input.previousPostal !== input.nextPostal;
  }
  return input.previousPostal.trim() !== input.nextPostal.trim();
}

export function reconcileDraftDate(
  dateKey: string | null,
  availableDateKeys: string[],
): { dateKey: string | null; cleared: boolean } {
  if (!dateKey) return { dateKey: null, cleared: false };
  if (availableDateKeys.includes(dateKey)) {
    return { dateKey, cleared: false };
  }
  return { dateKey: null, cleared: true };
}

export function reconcileDraftTimeSlot(
  timeSlotId: string | null,
  slots: PickupTimeSlot[],
): { timeSlotId: string | null; cleared: boolean } {
  if (!timeSlotId) return { timeSlotId: null, cleared: false };
  if (slots.some((slot) => slot.id === timeSlotId)) {
    return { timeSlotId, cleared: false };
  }
  return { timeSlotId: null, cleared: true };
}

export function slotsContainId(
  slots: PickupTimeSlot[],
  timeSlotId: string,
): boolean {
  return slots.some((slot) => slot.id === timeSlotId);
}

export function isCompleteDeliveryAddress(
  address: DeliveryAddressDraft | null | undefined,
): boolean {
  if (!address) return false;
  return (
    address.recipient.trim().length > 0 &&
    address.phone.trim().length > 0 &&
    address.address.trim().length > 0 &&
    address.subdistrict.trim().length > 0 &&
    address.district.trim().length > 0 &&
    address.province.trim().length > 0 &&
    address.postalCode.trim().length > 0
  );
}

function parseDeliveryAddress(
  raw: unknown,
): DeliveryAddressDraft | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Partial<DeliveryAddressDraft>;
  if (typeof value.postalCode !== "string") return undefined;
  return {
    recipient: typeof value.recipient === "string" ? value.recipient : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    address: typeof value.address === "string" ? value.address : "",
    subdistrict: typeof value.subdistrict === "string" ? value.subdistrict : "",
    district: typeof value.district === "string" ? value.district : "",
    province: typeof value.province === "string" ? value.province : "",
    postalCode: value.postalCode,
    building: typeof value.building === "string" ? value.building : "",
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

function parseDeliveryPromise(
  raw: unknown,
): DeliveryPromiseDraft | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Partial<DeliveryPromiseDraft>;
  if (typeof value.available !== "boolean") return undefined;
  const timeWindow =
    value.timeWindow &&
    typeof value.timeWindow === "object" &&
    typeof value.timeWindow.id === "string"
      ? {
          id: value.timeWindow.id,
          label:
            typeof value.timeWindow.label === "string"
              ? value.timeWindow.label
              : "",
          start:
            typeof value.timeWindow.start === "string"
              ? value.timeWindow.start
              : "",
          end:
            typeof value.timeWindow.end === "string" ? value.timeWindow.end : "",
        }
      : null;
  return {
    available: value.available,
    dateKey: typeof value.dateKey === "string" ? value.dateKey : null,
    relativeLabel:
      value.relativeLabel === "Today" || value.relativeLabel === "Tomorrow"
        ? value.relativeLabel
        : null,
    timeWindow,
    reason: typeof value.reason === "string" ? value.reason : "",
  };
}

/**
 * Migrates a legacy (pre-deliveryQuote) persisted DELIVERY payload into a
 * single authoritative DeliveryQuote. Only used when `deliveryQuote` is
 * absent from sessionStorage — new writes always persist `deliveryQuote`.
 */
function migrateLegacyDeliveryQuote(
  value: Partial<PersistedConfirmedPickup>,
  postalCode: string,
  deliveryMode: DeliveryModeClient,
): DeliveryQuote {
  const base = emptyDeliveryQuote({ postalCode, deliveryMode, status: "EMPTY" });
  const zoneId = typeof value.zoneId === "string" ? value.zoneId : null;
  const createdAt =
    typeof value.quoteCreatedAt === "string" ? value.quoteCreatedAt : null;
  const expiresAt =
    typeof value.quoteExpiresAt === "string" ? value.quoteExpiresAt : null;

  if (value.zoneSupported === false) {
    return markDeliveryQuoteUnsupported(base, postalCode, {
      createdAt,
      expiresAt,
      zoneId,
    });
  }
  if (value.zoneSupported !== true) {
    return base;
  }
  if (
    value.feeTrusted !== true ||
    typeof value.feeThb !== "number" ||
    value.quoteFresh === false
  ) {
    return invalidateDeliveryQuoteState(base, postalCode);
  }

  if (deliveryMode === "EARLIEST_AVAILABLE") {
    const promise = parseDeliveryPromise(value.deliveryPromise);
    if (promise?.available && promise.dateKey && promise.timeWindow) {
      return createValidDeliveryQuote({
        postalCode,
        zoneId,
        deliveryMode: "EARLIEST_AVAILABLE",
        deliveryDate: promise.dateKey,
        deliveryWindow: promise.timeWindow,
        relativeLabel: promise.relativeLabel,
        deliveryFee: value.feeThb,
        expiresAt,
        createdAt,
      });
    }
    return invalidateDeliveryQuoteState(base, postalCode);
  }

  // PREORDER
  if (
    typeof value.dateKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.dateKey) &&
    value.timeSlot &&
    typeof value.timeSlot.id === "string"
  ) {
    return createValidDeliveryQuote({
      postalCode,
      zoneId,
      deliveryMode: "PREORDER",
      deliveryDate: value.dateKey,
      deliveryWindow: value.timeSlot,
      deliveryFee: value.feeThb,
      expiresAt,
      createdAt,
    });
  }
  return createPendingPreorderQuote({
    postalCode,
    zoneId,
    deliveryFee: value.feeThb,
    expiresAt,
    createdAt,
  });
}

export function parsePersistedConfirmed(
  raw: string | null,
): PersistedConfirmedPickup | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<PersistedConfirmedPickup>;
    const serviceType =
      value.serviceType === "DELIVERY" ? "DELIVERY" : "PICKUP";

    if (serviceType === "DELIVERY") {
      const deliveryAddress = parseDeliveryAddress(value.deliveryAddress);
      if (!deliveryAddress) return null;
      const deliveryMode =
        value.deliveryMode === "PREORDER" ? "PREORDER" : "EARLIEST_AVAILABLE";

      // Shopping-first: Delivery may be selected before postal validation.
      if (!hasValidDeliveryPostalCode(deliveryAddress.postalCode)) {
        return {
          serviceType: "DELIVERY",
          deliveryMode,
          deliveryAddress,
          deliveryQuote: emptyDeliveryQuote({
            postalCode: deliveryAddress.postalCode,
            deliveryMode,
            status: "EMPTY",
          }),
        };
      }

      // Shopping-first: allow PENDING / INVALID / EMPTY quotes to persist so
      // the customer can keep shopping — checkout eligibility (not this
      // parser) is the gate that requires a VALID quote.
      const deliveryQuote =
        parsePersistedDeliveryQuote(value.deliveryQuote, deliveryMode) ??
        migrateLegacyDeliveryQuote(value, deliveryAddress.postalCode, deliveryMode);

      return {
        serviceType: "DELIVERY",
        deliveryMode,
        deliveryAddress,
        deliveryQuote,
      };
    }

    if (
      !value.boutique ||
      typeof value.boutique.id !== "string" ||
      typeof value.dateKey !== "string" ||
      !value.timeSlot ||
      typeof value.timeSlot.id !== "string"
    ) {
      return null;
    }
    return {
      serviceType: "PICKUP",
      boutique: value.boutique as Boutique,
      dateKey: value.dateKey,
      timeSlot: value.timeSlot,
    };
  } catch {
    return null;
  }
}

export function readPersistedConfirmed(): PersistedConfirmedPickup | null {
  if (typeof window === "undefined") return null;
  try {
    return parsePersistedConfirmed(
      window.sessionStorage.getItem(PICKUP_CONFIRMED_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function writePersistedConfirmed(
  value: PersistedConfirmedPickup | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (!value) {
      window.sessionStorage.removeItem(PICKUP_CONFIRMED_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      PICKUP_CONFIRMED_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}
