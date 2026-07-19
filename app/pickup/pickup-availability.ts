import type { PickupTimeSlot } from "@/lib/api/types";

export const PICKUP_CONFIRMED_STORAGE_KEY = "laduree.pickup.confirmed.v1";

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

export type PersistedConfirmedPickup = {
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
    return value as PersistedConfirmedPickup;
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
