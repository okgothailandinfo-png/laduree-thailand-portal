export type PickupTimeSlot = {
  id: string;
  label: string;
  start: string;
  end: string;
};

export type PickupAvailability = {
  boutiqueId: string;
  dateKey: string;
  timezone: string;
  slots: PickupTimeSlot[];
};

/** Persisted slot row used to validate checkout pickupSlotId. */
export type PickupSlotRecord = {
  id: string;
  /** Null when the mock source does not bind slots to a boutique. */
  boutiqueId: string | null;
  dateKey: string;
  label: string;
  start: string;
  end: string;
};
