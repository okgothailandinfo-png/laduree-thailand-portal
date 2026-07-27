import type { PickupTimeSlot } from "@/lib/api/types";

export const PICKUP_CONFIRMED_STORAGE_KEY = "laduree.pickup.confirmed.v1";

export type FulfillmentServiceType = "PICKUP" | "DELIVERY";

export type DeliveryAddressDraft = {
  recipient: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddressDraft = {
  recipient: "",
  phone: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
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

/** Singapore-verified delivery strings (docs/user-flow.md). */
export const DELIVERY_MESSAGES = {
  postalRequired: "The Postal Code field is required.",
  addressIncomplete: "Wrong postal code or address",
  addressUnavailable:
    "The postal / address is not available for delivery yet.",
} as const;

export type PersistedConfirmedPickup = {
  serviceType?: FulfillmentServiceType;
  boutique: {
    id: string;
    name: string;
    code: string;
    address: string;
    openingHours: string;
    lastOrderTime: string;
  };
  dateKey: string;
  timeSlot: PickupTimeSlot;
  deliveryAddress?: DeliveryAddressDraft;
};

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

/** Keep a draft date only when it still appears in the loaded date keys. */
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

/** Keep a draft slot only when it still appears in the loaded slots. */
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
  if (
    typeof value.recipient !== "string" ||
    typeof value.phone !== "string" ||
    typeof value.address !== "string" ||
    typeof value.subdistrict !== "string" ||
    typeof value.district !== "string" ||
    typeof value.province !== "string" ||
    typeof value.postalCode !== "string"
  ) {
    return undefined;
  }
  return {
    recipient: value.recipient,
    phone: value.phone,
    address: value.address,
    subdistrict: value.subdistrict,
    district: value.district,
    province: value.province,
    postalCode: value.postalCode,
  };
}

export function parsePersistedConfirmed(
  raw: string | null,
): PersistedConfirmedPickup | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<PersistedConfirmedPickup>;
    if (
      !value.boutique ||
      typeof value.boutique.id !== "string" ||
      typeof value.dateKey !== "string" ||
      !value.timeSlot ||
      typeof value.timeSlot.id !== "string"
    ) {
      return null;
    }
    const serviceType =
      value.serviceType === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const deliveryAddress = parseDeliveryAddress(value.deliveryAddress);
    if (serviceType === "DELIVERY" && !isCompleteDeliveryAddress(deliveryAddress)) {
      return null;
    }
    return {
      serviceType,
      boutique: value.boutique as PersistedConfirmedPickup["boutique"],
      dateKey: value.dateKey,
      timeSlot: value.timeSlot,
      ...(deliveryAddress ? { deliveryAddress } : {}),
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
    // Ignore quota / private-mode failures; in-memory state remains authoritative.
  }
}
