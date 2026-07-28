"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiClientError } from "@/lib/api/client";
import { fetchBoutiques } from "@/lib/api/catalog";
import {
  fetchDeliveryQuote,
  type DeliveryQuoteResponse,
  type DeliveryTimeWindowDto,
} from "@/lib/api/delivery";
import { fetchPickupAvailability } from "@/lib/api/pickup";
import type { Boutique, PickupTimeSlot } from "@/lib/api/types";
import { hasValidConfirmedPickupIds } from "../cart/checkout-eligibility";
import {
  createPendingPreorderQuote,
  createValidDeliveryQuote,
  emptyDeliveryQuote,
  invalidateDeliveryQuoteState,
  isDeliveryQuoteValidForCheckout,
  markDeliveryQuotePending,
  markDeliveryQuoteUnsupported,
  resolveDeliveryQuoteStatus,
  type DeliveryQuote,
} from "./delivery-quote";
import {
  isAbortError,
  EMPTY_DELIVERY_ADDRESS,
  PICKUP_MESSAGES,
  DELIVERY_MESSAGES,
  hasValidDeliveryPostalCode,
  normalizeDeliveryPostalInput,
  readPersistedConfirmed,
  reconcileDraftDate,
  reconcileDraftTimeSlot,
  slotsContainId,
  writePersistedConfirmed,
  type DeliveryAddressDraft,
  type FulfillmentServiceType,
  type PersistedConfirmedPickup,
} from "./pickup-availability";
import { getCandidateDateKeys } from "./pickup-dates";
import {
  resolveInitialServiceOnOpen,
  type OpenPickupSelectionOpts,
} from "./open-pickup-selection";

export type { DeliveryAddressDraft, FulfillmentServiceType };
export type { OpenPickupSelectionOpts };

export type PickupDraft = {
  serviceType: FulfillmentServiceType;
  boutiqueId: string | null;
  dateKey: string | null;
  timeSlotId: string | null;
  deliveryAddress: DeliveryAddressDraft;
  deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER";
};

export type ConfirmedPickup =
  | {
      serviceType: "PICKUP";
      boutique: Boutique;
      dateKey: string;
      timeSlot: PickupTimeSlot;
    }
  | {
      serviceType: "DELIVERY";
      deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER";
      deliveryAddress: DeliveryAddressDraft;
      /** Authoritative delivery quote — single source of truth for display + eligibility. */
      deliveryQuote: DeliveryQuote;
    };

export type AsyncStatus = "idle" | "loading" | "success" | "error" | "empty";

export type PickupStep = "service" | "address" | "mode" | "boutique" | "datetime";

type PickupContextValue = {
  isOpen: boolean;
  openPickupSelection: (opts?: OpenPickupSelectionOpts) => void;
  closePickupSelection: () => void;
  step: PickupStep;
  setStep: (step: PickupStep) => void;
  draft: PickupDraft;
  setDraftServiceType: (serviceType: FulfillmentServiceType) => void;
  setDraftBoutique: (id: string) => void;
  setDraftDate: (dateKey: string) => void;
  setDraftTimeSlot: (slotId: string) => void;
  setDraftDeliveryMode: (mode: "EARLIEST_AVAILABLE" | "PREORDER") => void;
  setDraftDeliveryAddress: (patch: Partial<DeliveryAddressDraft>) => void;
  /** Editable cart postal field — digits only; does not fetch on keystroke. */
  deliveryPostalInput: string;
  setDeliveryPostalInput: (raw: string) => void;
  validationError: string | null;
  clearValidationError: () => void;
  confirmSelection: () => Promise<boolean>;
  /** Select Delivery without postal — allows products-before-postal shopping. */
  confirmDeliveryServiceOnly: () => void;
  applyDeliveryPostalFromCart: (postalCode: string) => Promise<boolean>;
  confirmDeliveryPreorderDateFromCart: (dateKey: string) => Promise<boolean>;
  setConfirmedDeliveryModeFromCart: (
    mode: "EARLIEST_AVAILABLE" | "PREORDER",
  ) => void;
  confirming: boolean;
  confirmed: ConfirmedPickup | null;
  /** Authoritative delivery quote for the confirmed selection (DELIVERY only). */
  deliveryQuote: DeliveryQuote | null;
  isPickupComplete: boolean;
  isFulfillmentComplete: boolean;
  /** False when live availability no longer includes the confirmed slot. */
  confirmedSlotAvailable: boolean;
  resetSelection: () => void;
  clearConfirmedSlot: (message?: string) => void;
  boutiques: Boutique[];
  boutiquesStatus: "loading" | "success" | "error" | "empty";
  boutiquesError: string | null;
  reloadBoutiques: () => void;
  availableDateKeys: string[];
  datesStatus: AsyncStatus;
  datesError: string | null;
  reloadDates: () => void;
  timeSlots: PickupTimeSlot[];
  slotsStatus: AsyncStatus;
  slotsError: string | null;
  reloadSlots: () => void;
  deliveryQuoteStatus: AsyncStatus;
  deliveryQuoteError: string | null;
  deliveryPreorderDateKeys: string[];
  deliveryWindowByDate: Record<string, DeliveryTimeWindowDto>;
  reloadDeliveryQuote: () => void;
  invalidateDeliveryQuote: () => void;
};

const PickupContext = createContext<PickupContextValue | null>(null);

const emptyDraft: PickupDraft = {
  serviceType: "PICKUP",
  boutiqueId: null,
  dateKey: null,
  timeSlotId: null,
  deliveryAddress: { ...EMPTY_DELIVERY_ADDRESS },
  deliveryMode: "EARLIEST_AVAILABLE",
};

function deliveryAddressForQuote(
  address: DeliveryAddressDraft,
): Parameters<typeof fetchDeliveryQuote>[0]["address"] {
  const payload: Parameters<typeof fetchDeliveryQuote>[0]["address"] = {
    postalCode: address.postalCode.trim(),
  };
  if (address.province.trim()) payload.province = address.province.trim();
  if (address.district.trim()) payload.district = address.district.trim();
  if (address.subdistrict.trim()) payload.subdistrict = address.subdistrict.trim();
  if (address.address.trim()) payload.address = address.address.trim();
  return payload;
}

function emptyDeliveryQuoteFor(
  deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER",
  postalCode: string,
): DeliveryQuote {
  return emptyDeliveryQuote({ deliveryMode, postalCode, status: "EMPTY" });
}

function applyQuoteToDeliveryState(
  quote: DeliveryQuoteResponse,
  setters: {
    setDeliveryPreorderDateKeys: (v: string[]) => void;
    setDeliveryWindowByDate: (v: Record<string, DeliveryTimeWindowDto>) => void;
    setDeliveryQuoteStatus: (v: AsyncStatus) => void;
  },
): void {
  setters.setDeliveryPreorderDateKeys(quote.preorderDateKeys);
  setters.setDeliveryWindowByDate({ ...quote.windowByDate });
  setters.setDeliveryQuoteStatus(
    quote.preorderDateKeys.length === 0 && !quote.earliestAvailable.available
      ? "empty"
      : "success",
  );
}
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (
      error.code === "BAD_RESPONSE" ||
      error.status >= 500 ||
      error.message.toLowerCase().includes("availability")
    ) {
      return fallback;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

function mapPersistedToConfirmed(
  persisted: PersistedConfirmedPickup,
): ConfirmedPickup | null {
  if (persisted.serviceType === "DELIVERY") {
    if (!persisted.deliveryAddress) return null;
    const deliveryMode =
      persisted.deliveryMode === "PREORDER" ? "PREORDER" : "EARLIEST_AVAILABLE";
    return {
      serviceType: "DELIVERY",
      deliveryMode,
      deliveryAddress: persisted.deliveryAddress,
      deliveryQuote:
        persisted.deliveryQuote ??
        emptyDeliveryQuoteFor(deliveryMode, persisted.deliveryAddress.postalCode),
    };
  }
  if (
    !persisted.boutique ||
    !persisted.dateKey ||
    !persisted.timeSlot
  ) {
    return null;
  }
  return {
    serviceType: "PICKUP",
    boutique: persisted.boutique as Boutique,
    dateKey: persisted.dateKey,
    timeSlot: persisted.timeSlot,
  };
}

function confirmedToPersisted(
  value: ConfirmedPickup,
): PersistedConfirmedPickup {
  if (value.serviceType === "PICKUP") {
    return {
      serviceType: "PICKUP",
      boutique: value.boutique,
      dateKey: value.dateKey,
      timeSlot: value.timeSlot,
    };
  }
  return {
    serviceType: "DELIVERY",
    deliveryMode: value.deliveryMode,
    deliveryAddress: value.deliveryAddress,
    deliveryQuote: value.deliveryQuote,
  };
}

function isDeliveryFulfillmentComplete(
  confirmed: ConfirmedPickup & { serviceType: "DELIVERY" },
): boolean {
  return isDeliveryQuoteValidForCheckout(confirmed.deliveryQuote);
}

export function PickupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<PickupStep>("service");
  const [draft, setDraft] = useState<PickupDraft>(emptyDraft);
  const [confirmed, setConfirmed] = useState<ConfirmedPickup | null>(() => {
    const persisted = readPersistedConfirmed();
    if (!persisted) return null;
    return mapPersistedToConfirmed(persisted);
  });
  /** Shared editable postal field for cart (survives dual strip remounts). */
  const [deliveryPostalInput, setDeliveryPostalInputState] = useState(() => {
    const persisted = readPersistedConfirmed();
    if (
      persisted?.serviceType === "DELIVERY" &&
      persisted.deliveryAddress?.postalCode
    ) {
      return normalizeDeliveryPostalInput(persisted.deliveryAddress.postalCode);
    }
    return "";
  });
  const deliveryPostalInputRef = useRef(deliveryPostalInput);
  const [confirmedSlotAvailable, setConfirmedSlotAvailable] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [boutiquesStatus, setBoutiquesStatus] = useState<
    "loading" | "success" | "error" | "empty"
  >("loading");
  const [boutiquesError, setBoutiquesError] = useState<string | null>(null);
  const [boutiquesReloadToken, setBoutiquesReloadToken] = useState(0);

  const [availableDateKeys, setAvailableDateKeys] = useState<string[]>([]);
  const [datesStatus, setDatesStatus] = useState<AsyncStatus>("idle");
  const [datesError, setDatesError] = useState<string | null>(null);
  const [datesReloadToken, setDatesReloadToken] = useState(0);

  const [timeSlots, setTimeSlots] = useState<PickupTimeSlot[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<AsyncStatus>("idle");
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsReloadToken, setSlotsReloadToken] = useState(0);

  const [deliveryQuoteStatus, setDeliveryQuoteStatus] =
    useState<AsyncStatus>("idle");
  const [deliveryQuoteError, setDeliveryQuoteError] = useState<string | null>(
    null,
  );
  const [deliveryQuoteReloadToken, setDeliveryQuoteReloadToken] = useState(0);
  /** Ephemeral catalog helpers for the preorder date-chip UX only — never the
   * source of truth for display. Cart/checkout read `confirmed.deliveryQuote`. */
  const [deliveryPreorderDateKeys, setDeliveryPreorderDateKeys] = useState<
    string[]
  >([]);
  const [deliveryWindowByDate, setDeliveryWindowByDate] = useState<
    Record<string, DeliveryTimeWindowDto>
  >({});

  const clearAvailability = useCallback(() => {
    setAvailableDateKeys([]);
    setDatesStatus("idle");
    setDatesError(null);
    setTimeSlots([]);
    setSlotsStatus("idle");
    setSlotsError(null);
  }, []);

  const clearDeliveryQuote = useCallback(() => {
    setDeliveryQuoteStatus("idle");
    setDeliveryQuoteError(null);
    setDeliveryPreorderDateKeys([]);
    setDeliveryWindowByDate({});
  }, []);

  const persistConfirmed = useCallback((value: ConfirmedPickup | null) => {
    setConfirmed(value);
    writePersistedConfirmed(value ? confirmedToPersisted(value) : null);
    if (value) setConfirmedSlotAvailable(true);
  }, []);

  const clearConfirmedSlot = useCallback(
    (message?: string) => {
      persistConfirmed(null);
      setConfirmedSlotAvailable(true);
      setDraft((prev) => ({ ...prev, dateKey: null, timeSlotId: null }));
      if (message) setValidationError(message);
    },
    [persistConfirmed],
  );

  const reloadBoutiques = useCallback(() => {
    setBoutiquesStatus("loading");
    setBoutiquesError(null);
    setBoutiquesReloadToken((value) => value + 1);
  }, []);

  const reloadDates = useCallback(() => {
    if (!draft.boutiqueId) {
      setDatesStatus("idle");
      setDatesError(null);
      setAvailableDateKeys([]);
      setValidationError(PICKUP_MESSAGES.missingBoutique);
      return;
    }
    setDatesStatus("loading");
    setDatesError(null);
    setDatesReloadToken((value) => value + 1);
  }, [draft.boutiqueId]);

  const reloadSlots = useCallback(() => {
    if (!draft.boutiqueId) {
      setSlotsStatus("idle");
      setSlotsError(null);
      setTimeSlots([]);
      setValidationError(PICKUP_MESSAGES.missingBoutique);
      return;
    }
    if (!draft.dateKey) {
      setSlotsStatus("idle");
      setSlotsError(null);
      setTimeSlots([]);
      return;
    }
    setSlotsStatus("loading");
    setSlotsError(null);
    setSlotsReloadToken((value) => value + 1);
  }, [draft.boutiqueId, draft.dateKey]);

  const reloadDeliveryQuote = useCallback(() => {
    if (!hasValidDeliveryPostalCode(draft.deliveryAddress.postalCode)) {
      setDeliveryQuoteStatus("idle");
      setDeliveryQuoteError(null);
      return;
    }
    setDeliveryQuoteStatus("loading");
    setDeliveryQuoteError(null);
    setDeliveryQuoteReloadToken((value) => value + 1);
  }, [draft.deliveryAddress.postalCode]);

  const invalidateDeliveryQuote = useCallback(() => {
    setConfirmed((prev) => {
      if (!prev || prev.serviceType !== "DELIVERY") return prev;
      if (
        prev.deliveryQuote.status === "INVALID" ||
        prev.deliveryQuote.status === "EMPTY"
      ) {
        return prev;
      }
      const next: ConfirmedPickup = {
        ...prev,
        deliveryQuote: invalidateDeliveryQuoteState(prev.deliveryQuote),
      };
      writePersistedConfirmed(confirmedToPersisted(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchBoutiques({ signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return;
        setBoutiques(rows);
        setBoutiquesStatus(rows.length === 0 ? "empty" : "success");
        setConfirmed((prev) => {
          if (!prev || prev.serviceType !== "PICKUP") return prev;
          const boutique = rows.find((item) => item.id === prev.boutique.id);
          if (!boutique) {
            writePersistedConfirmed(null);
            return null;
          }
          if (boutique === prev.boutique) return prev;
          const next = { ...prev, boutique };
          writePersistedConfirmed(confirmedToPersisted(next));
          return next;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setBoutiques([]);
        setBoutiquesError(errorMessage(error, "Unable to load boutiques."));
        setBoutiquesStatus("error");
      });

    return () => controller.abort();
  }, [boutiquesReloadToken]);

  // Revalidate persisted pickup slot only — delivery has no pickup availability check.
  useEffect(() => {
    if (!confirmed || confirmed.serviceType !== "PICKUP") return;

    const boutiqueId = confirmed.boutique.id;
    const dateKey = confirmed.dateKey;
    const timeSlotId = confirmed.timeSlot.id;
    const controller = new AbortController();

    fetchPickupAvailability(
      { boutiqueId, dateKey },
      { signal: controller.signal },
    )
      .then((availability) => {
        if (controller.signal.aborted) return;
        const latest = readPersistedConfirmed();
        if (
          !latest ||
          latest.serviceType !== "PICKUP" ||
          latest.boutique?.id !== boutiqueId ||
          latest.dateKey !== dateKey ||
          latest.timeSlot?.id !== timeSlotId
        ) {
          return;
        }
        if (!slotsContainId(availability.slots, timeSlotId)) {
          clearConfirmedSlot(PICKUP_MESSAGES.staleSlot);
          return;
        }
        setConfirmedSlotAvailable(true);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setConfirmedSlotAvailable(true);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by pickup ids only
  }, [
    confirmed?.serviceType === "PICKUP" ? confirmed.boutique.id : null,
    confirmed?.serviceType === "PICKUP" ? confirmed.dateKey : null,
    confirmed?.serviceType === "PICKUP" ? confirmed.timeSlot.id : null,
    clearConfirmedSlot,
  ]);

  // Pickup-only date probing.
  useEffect(() => {
    const boutiqueId = draft.boutiqueId;
    if (draft.serviceType !== "PICKUP" || !boutiqueId) return;

    const controller = new AbortController();
    const candidateKeys = getCandidateDateKeys();

    Promise.all(
      candidateKeys.map(async (dateKey) => {
        const availability = await fetchPickupAvailability(
          { boutiqueId, dateKey },
          { signal: controller.signal },
        );
        return { dateKey, slotCount: availability.slots.length };
      }),
    )
      .then((rows) => {
        if (controller.signal.aborted) return;
        const keys = rows
          .filter((row) => row.slotCount > 0)
          .map((row) => row.dateKey);
        setAvailableDateKeys(keys);
        setDatesStatus(keys.length === 0 ? "empty" : "success");

        let clearedDate = false;
        setDraft((prev) => {
          const reconciled = reconcileDraftDate(prev.dateKey, keys);
          if (!reconciled.cleared) return prev;
          clearedDate = true;
          return { ...prev, dateKey: null, timeSlotId: null };
        });
        if (clearedDate) {
          setValidationError(PICKUP_MESSAGES.staleDate);
          setTimeSlots([]);
          setSlotsStatus("idle");
          setSlotsError(null);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setAvailableDateKeys([]);
        setDatesError(errorMessage(error, PICKUP_MESSAGES.datesFailed));
        setDatesStatus("error");
      });

    return () => controller.abort();
  }, [draft.serviceType, draft.boutiqueId, datesReloadToken]);

  // Pickup-only slot loading.
  useEffect(() => {
    const boutiqueId = draft.boutiqueId;
    const dateKey = draft.dateKey;
    if (draft.serviceType !== "PICKUP" || !boutiqueId || !dateKey) return;

    const controller = new AbortController();

    fetchPickupAvailability(
      { boutiqueId, dateKey },
      { signal: controller.signal },
    )
      .then((availability) => {
        if (controller.signal.aborted) return;
        const slots = availability.slots;
        setTimeSlots(slots);
        setSlotsStatus(slots.length === 0 ? "empty" : "success");

        let clearedSlot = false;
        setDraft((prev) => {
          const reconciled = reconcileDraftTimeSlot(prev.timeSlotId, slots);
          if (!reconciled.cleared) return prev;
          clearedSlot = true;
          return { ...prev, timeSlotId: null };
        });
        if (clearedSlot) {
          setValidationError(PICKUP_MESSAGES.staleSlot);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setTimeSlots([]);
        setSlotsError(errorMessage(error, PICKUP_MESSAGES.slotsFailed));
        setSlotsStatus("error");
      });

    return () => controller.abort();
  }, [draft.serviceType, draft.boutiqueId, draft.dateKey, slotsReloadToken]);

  // Delivery quote for modal reopen / explicit reload only — not cart keystrokes.
  // Cart availability is button-driven via applyDeliveryPostalFromCart.
  useEffect(() => {
    if (!isOpen) return;
    if (draft.serviceType !== "DELIVERY") return;
    if (!hasValidDeliveryPostalCode(draft.deliveryAddress.postalCode)) return;

    const controller = new AbortController();

    fetchDeliveryQuote(
      { address: deliveryAddressForQuote(draft.deliveryAddress) },
      { signal: controller.signal },
    )
      .then((quote) => {
        if (controller.signal.aborted) return;
        applyQuoteToDeliveryState(quote, {
          setDeliveryPreorderDateKeys,
          setDeliveryWindowByDate,
          setDeliveryQuoteStatus,
        });

        let clearedDate = false;
        setDraft((prev) => {
          if (prev.deliveryMode !== "PREORDER") return prev;
          const reconciled = reconcileDraftDate(
            prev.dateKey,
            quote.preorderDateKeys,
          );
          if (!reconciled.cleared) return prev;
          clearedDate = true;
          return { ...prev, dateKey: null, timeSlotId: null };
        });
        if (clearedDate) {
          setValidationError(DELIVERY_MESSAGES.noPreorderDates);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setDeliveryQuoteError(
          errorMessage(error, DELIVERY_MESSAGES.unavailable),
        );
        setDeliveryQuoteStatus("error");
      });

    return () => controller.abort();
  }, [
    isOpen,
    draft.serviceType,
    draft.deliveryAddress,
    draft.deliveryMode,
    deliveryQuoteReloadToken,
  ]);

  const openPickupSelection = useCallback(
    (opts?: OpenPickupSelectionOpts) => {
      setValidationError(null);

      const confirmedServiceType = confirmed?.serviceType ?? null;
      const initial = resolveInitialServiceOnOpen({
        confirmedServiceType,
        requestedServiceType: opts?.serviceType,
      });

      if (initial.preserveConfirmed && confirmed) {
        if (confirmed.serviceType === "PICKUP") {
          setDraft({
            serviceType: "PICKUP",
            boutiqueId: confirmed.boutique.id,
            dateKey: confirmed.dateKey,
            timeSlotId: confirmed.timeSlot.id,
            deliveryAddress: { ...EMPTY_DELIVERY_ADDRESS },
            deliveryMode: "EARLIEST_AVAILABLE",
          });
          setAvailableDateKeys([]);
          setDatesStatus("loading");
          setDatesError(null);
          setTimeSlots([]);
          setSlotsStatus("loading");
          setSlotsError(null);
          clearDeliveryQuote();
          setDatesReloadToken((value) => value + 1);
          setSlotsReloadToken((value) => value + 1);
          setStep(opts?.step ?? "datetime");
        } else {
          setDraft({
            serviceType: "DELIVERY",
            boutiqueId: null,
            dateKey: confirmed.deliveryQuote.deliveryDate ?? null,
            timeSlotId: confirmed.deliveryQuote.deliveryWindow?.id ?? null,
            deliveryAddress: { ...confirmed.deliveryAddress },
            deliveryMode: confirmed.deliveryMode,
          });
          clearAvailability();
          clearDeliveryQuote();
          setDeliveryQuoteStatus("loading");
          setDeliveryQuoteReloadToken((value) => value + 1);
          const defaultStep =
            confirmed.deliveryMode === "PREORDER"
              ? (opts?.step ?? "datetime")
              : (opts?.step ?? "mode");
          setStep(defaultStep);
        }
      } else {
        // No confirmed selection, or explicit switch to the other service.
        if (initial.serviceChanged) {
          persistConfirmed(null);
        }
        setDraft({
          ...emptyDraft,
          serviceType: initial.serviceType,
        });
        clearAvailability();
        clearDeliveryQuote();
        setStep(opts?.step ?? "service");
      }
      setIsOpen(true);
    },
    [clearAvailability, clearDeliveryQuote, confirmed, persistConfirmed],
  );

  const closePickupSelection = useCallback(() => {
    setIsOpen(false);
    setValidationError(null);
  }, []);

  const setDraftServiceType = useCallback(
    (serviceType: FulfillmentServiceType) => {
      setDraft((prev) => {
        if (prev.serviceType === serviceType) return prev;
        return {
          ...emptyDraft,
          serviceType,
        };
      });
      clearAvailability();
      clearDeliveryQuote();
      persistConfirmed(null);
      setValidationError(null);
    },
    [clearAvailability, clearDeliveryQuote, persistConfirmed],
  );

  const setDraftBoutique = useCallback((id: string) => {
    let changed = false;
    setDraft((prev) => {
      if (prev.boutiqueId === id) return prev;
      changed = true;
      return {
        ...prev,
        boutiqueId: id,
        dateKey: null,
        timeSlotId: null,
      };
    });
    setValidationError(null);
    if (!changed) return;
    setAvailableDateKeys([]);
    setDatesStatus("loading");
    setDatesError(null);
    setTimeSlots([]);
    setSlotsStatus("idle");
    setSlotsError(null);
  }, []);

  const setDraftDate = useCallback((dateKey: string) => {
    let changed = false;
    let isPickup = false;
    setDraft((prev) => {
      if (prev.dateKey === dateKey) return prev;
      changed = true;
      isPickup = prev.serviceType === "PICKUP";
      return { ...prev, dateKey, timeSlotId: null };
    });
    setValidationError(null);
    if (!changed) return;
    if (isPickup) {
      setTimeSlots([]);
      setSlotsStatus("loading");
      setSlotsError(null);
    }
  }, []);

  const setDraftTimeSlot = useCallback((slotId: string) => {
    setDraft((prev) => ({ ...prev, timeSlotId: slotId }));
    setValidationError(null);
  }, []);

  const setDraftDeliveryMode = useCallback((mode: "EARLIEST_AVAILABLE" | "PREORDER") => {
    setDraft((prev) => {
      if (prev.deliveryMode === mode) return prev;
      return {
        ...prev,
        deliveryMode: mode,
        dateKey: null,
        timeSlotId: null,
      };
    });
    setValidationError(null);
  }, []);

  const setDraftDeliveryAddress = useCallback(
    (patch: Partial<DeliveryAddressDraft>) => {
      setDraft((prev) => ({
        ...prev,
        deliveryAddress: { ...prev.deliveryAddress, ...patch },
      }));
      if (typeof patch.postalCode === "string") {
        const normalized = normalizeDeliveryPostalInput(patch.postalCode);
        deliveryPostalInputRef.current = normalized;
        setDeliveryPostalInputState(normalized);
      }
      clearDeliveryQuote();
      setValidationError(null);
    },
    [clearDeliveryQuote],
  );

  const setDeliveryPostalInput = useCallback((raw: string) => {
    const next = normalizeDeliveryPostalInput(raw);
    const previous = deliveryPostalInputRef.current;
    if (previous === next) return;

    deliveryPostalInputRef.current = next;
    setDeliveryPostalInputState(next);

    // Keep draft postal in sync for modal reopen, but cart typing must not
    // trigger availability — quote effect is gated on isOpen / Check button.
    setDraft((prev) => {
      if (prev.serviceType !== "DELIVERY") return prev;
      if (prev.deliveryAddress.postalCode === next) return prev;
      return {
        ...prev,
        deliveryAddress: { ...prev.deliveryAddress, postalCode: next },
      };
    });

    setConfirmed((prev) => {
      if (!prev || prev.serviceType !== "DELIVERY") return prev;
      const previousPostal = prev.deliveryAddress.postalCode;
      if (previousPostal === next) return prev;

      const nextConfirmed: ConfirmedPickup = {
        serviceType: "DELIVERY",
        deliveryMode: prev.deliveryMode,
        deliveryAddress: { ...prev.deliveryAddress, postalCode: next },
        deliveryQuote: invalidateDeliveryQuoteState(prev.deliveryQuote, next),
      };
      writePersistedConfirmed(confirmedToPersisted(nextConfirmed));
      return nextConfirmed;
    });

    // Clear ephemeral catalog UI when the editable postal string changes.
    // Availability fetch remains button-only (applyDeliveryPostalFromCart).
    setDeliveryPreorderDateKeys([]);
    setDeliveryWindowByDate({});
    setDeliveryQuoteStatus("idle");
    setDeliveryQuoteError(null);
    setValidationError(null);
  }, []);



  const clearValidationError = useCallback(() => {
    setValidationError(null);
  }, []);

  const confirmSelection = useCallback(async (): Promise<boolean> => {
    if (draft.serviceType === "PICKUP") {
      if (!draft.boutiqueId) {
        setValidationError(PICKUP_MESSAGES.missingBoutique);
        setStep("boutique");
        return false;
      }
      if (!draft.dateKey) {
        setValidationError("Please select a pickup date.");
        setStep("datetime");
        return false;
      }
      if (!draft.timeSlotId) {
        setValidationError("Please select a time slot.");
        setStep("datetime");
        return false;
      }

      const boutique =
        boutiques.find((item) => item.id === draft.boutiqueId) ?? null;
      const timeSlot =
        timeSlots.find((slot) => slot.id === draft.timeSlotId) ?? null;

      if (!boutique || !timeSlot || !draft.dateKey) {
        setValidationError("Please complete your pickup selection.");
        return false;
      }

      persistConfirmed({
        serviceType: "PICKUP",
        boutique,
        dateKey: draft.dateKey,
        timeSlot,
      });
      setValidationError(null);
      setIsOpen(false);
      return true;
    }

    // DELIVERY
    if (!hasValidDeliveryPostalCode(draft.deliveryAddress.postalCode)) {
      setValidationError(DELIVERY_MESSAGES.postalRequired);
      setStep("address");
      return false;
    }

    setConfirming(true);
    try {
      const quote = await fetchDeliveryQuote({
        address: deliveryAddressForQuote(draft.deliveryAddress),
      });

      if (!quote.zoneSupported) {
        setValidationError(DELIVERY_MESSAGES.addressUnavailable);
        setStep("address");
        return false;
      }
      if (!quote.feeTrusted || quote.feeThb === null) {
        setValidationError(DELIVERY_MESSAGES.unavailable);
        setStep("mode");
        return false;
      }

      if (draft.deliveryMode === "EARLIEST_AVAILABLE") {
        if (
          !quote.earliestAvailable.available ||
          !quote.earliestAvailable.timeWindow ||
          !quote.earliestAvailable.dateKey
        ) {
          setValidationError(DELIVERY_MESSAGES.unavailable);
          setStep("mode");
          return false;
        }
        persistConfirmed({
          serviceType: "DELIVERY",
          deliveryMode: "EARLIEST_AVAILABLE",
          deliveryAddress: { ...draft.deliveryAddress },
          deliveryQuote: createValidDeliveryQuote({
            postalCode: draft.deliveryAddress.postalCode,
            zoneId: quote.zoneId,
            deliveryMode: "EARLIEST_AVAILABLE",
            deliveryDate: quote.earliestAvailable.dateKey,
            deliveryWindow: quote.earliestAvailable.timeWindow,
            relativeLabel: quote.earliestAvailable.relativeLabel,
            deliveryFee: quote.feeThb,
            expiresAt: quote.quoteExpiresAt,
            createdAt: quote.quoteCreatedAt,
          }),
        });
      } else {
        if (!draft.dateKey) {
          setValidationError(DELIVERY_MESSAGES.noPreorderDates);
          setStep("datetime");
          return false;
        }
        const systemWindow = quote.windowByDate[draft.dateKey];
        if (!systemWindow) {
          setValidationError(DELIVERY_MESSAGES.noPreorderWindow);
          setStep("datetime");
          return false;
        }
        persistConfirmed({
          serviceType: "DELIVERY",
          deliveryMode: "PREORDER",
          deliveryAddress: { ...draft.deliveryAddress },
          deliveryQuote: createValidDeliveryQuote({
            postalCode: draft.deliveryAddress.postalCode,
            zoneId: quote.zoneId,
            deliveryMode: "PREORDER",
            deliveryDate: draft.dateKey,
            deliveryWindow: systemWindow,
            deliveryFee: quote.feeThb,
            expiresAt: quote.quoteExpiresAt,
            createdAt: quote.quoteCreatedAt,
          }),
        });
      }

      setValidationError(null);
      setIsOpen(false);
      return true;
    } catch (error: unknown) {
      setValidationError(
        errorMessage(error, DELIVERY_MESSAGES.unavailable),
      );
      setStep("mode");
      return false;
    } finally {
      setConfirming(false);
    }
  }, [boutiques, draft, persistConfirmed, timeSlots]);

  const confirmDeliveryServiceOnly = useCallback(() => {
    const mode = draft.deliveryMode;
    deliveryPostalInputRef.current = "";
    setDeliveryPostalInputState("");
    persistConfirmed({
      serviceType: "DELIVERY",
      deliveryMode: mode,
      deliveryAddress: { ...EMPTY_DELIVERY_ADDRESS },
      deliveryQuote: emptyDeliveryQuoteFor(mode, ""),
    });
    setDraft({
      ...emptyDraft,
      serviceType: "DELIVERY",
      deliveryMode: mode,
    });
    clearAvailability();
    clearDeliveryQuote();
    setValidationError(null);
    setIsOpen(false);
  }, [clearAvailability, clearDeliveryQuote, draft.deliveryMode, persistConfirmed]);

  const applyDeliveryPostalFromCart = useCallback(
    async (postalCode: string): Promise<boolean> => {
      const trimmed = normalizeDeliveryPostalInput(postalCode);
      if (!hasValidDeliveryPostalCode(trimmed)) {
        setValidationError(DELIVERY_MESSAGES.postalRequired);
        return false;
      }
      setDeliveryPostalInputState(trimmed);
      deliveryPostalInputRef.current = trimmed;

      const currentMode =
        confirmed?.serviceType === "DELIVERY"
          ? confirmed.deliveryMode
          : draft.serviceType === "DELIVERY"
            ? draft.deliveryMode
            : "EARLIEST_AVAILABLE";
      const currentAddress =
        confirmed?.serviceType === "DELIVERY"
          ? confirmed.deliveryAddress
          : { ...EMPTY_DELIVERY_ADDRESS };
      const previousQuote =
        confirmed?.serviceType === "DELIVERY"
          ? confirmed.deliveryQuote
          : emptyDeliveryQuoteFor(currentMode, trimmed);
      const addressWithPostal = { ...currentAddress, postalCode: trimmed };

      // Shopping-first: mark PENDING immediately while the fetch is in flight.
      persistConfirmed({
        serviceType: "DELIVERY",
        deliveryMode: currentMode,
        deliveryAddress: addressWithPostal,
        deliveryQuote: markDeliveryQuotePending(previousQuote, trimmed),
      });

      setDeliveryQuoteStatus("loading");
      setConfirming(true);
      try {
        const quote = await fetchDeliveryQuote({
          address: { postalCode: trimmed },
        });

        applyQuoteToDeliveryState(quote, {
          setDeliveryPreorderDateKeys,
          setDeliveryWindowByDate,
          setDeliveryQuoteStatus,
        });

        if (!quote.zoneSupported) {
          persistConfirmed({
            serviceType: "DELIVERY",
            deliveryMode: currentMode,
            deliveryAddress: addressWithPostal,
            deliveryQuote: markDeliveryQuoteUnsupported(
              previousQuote,
              trimmed,
              {
                createdAt: quote.quoteCreatedAt,
                expiresAt: quote.quoteExpiresAt,
                zoneId: quote.zoneId,
              },
            ),
          });
          setValidationError(DELIVERY_MESSAGES.addressUnavailable);
          return false;
        }

        if (!quote.feeTrusted || quote.feeThb === null) {
          persistConfirmed({
            serviceType: "DELIVERY",
            deliveryMode: currentMode,
            deliveryAddress: addressWithPostal,
            deliveryQuote: invalidateDeliveryQuoteState(previousQuote, trimmed),
          });
          setValidationError(DELIVERY_MESSAGES.unavailable);
          return false;
        }

        if (currentMode === "EARLIEST_AVAILABLE") {
          if (
            !quote.earliestAvailable.available ||
            !quote.earliestAvailable.timeWindow ||
            !quote.earliestAvailable.dateKey
          ) {
            persistConfirmed({
              serviceType: "DELIVERY",
              deliveryMode: "EARLIEST_AVAILABLE",
              deliveryAddress: addressWithPostal,
              deliveryQuote: invalidateDeliveryQuoteState(
                previousQuote,
                trimmed,
              ),
            });
            setValidationError(DELIVERY_MESSAGES.unavailable);
            return false;
          }
          persistConfirmed({
            serviceType: "DELIVERY",
            deliveryMode: "EARLIEST_AVAILABLE",
            deliveryAddress: addressWithPostal,
            deliveryQuote: createValidDeliveryQuote({
              postalCode: trimmed,
              zoneId: quote.zoneId,
              deliveryMode: "EARLIEST_AVAILABLE",
              deliveryDate: quote.earliestAvailable.dateKey,
              deliveryWindow: quote.earliestAvailable.timeWindow,
              relativeLabel: quote.earliestAvailable.relativeLabel,
              deliveryFee: quote.feeThb,
              expiresAt: quote.quoteExpiresAt,
              createdAt: quote.quoteCreatedAt,
            }),
          });
          setValidationError(null);
          return true;
        }

        // PREORDER — zone + fee confirmed, date still pending selection.
        persistConfirmed({
          serviceType: "DELIVERY",
          deliveryMode: "PREORDER",
          deliveryAddress: addressWithPostal,
          deliveryQuote: createPendingPreorderQuote({
            postalCode: trimmed,
            zoneId: quote.zoneId,
            deliveryFee: quote.feeThb,
            expiresAt: quote.quoteExpiresAt,
            createdAt: quote.quoteCreatedAt,
          }),
        });
        setValidationError(null);
        return true;
      } catch (error: unknown) {
        setValidationError(
          errorMessage(error, DELIVERY_MESSAGES.unavailable),
        );
        setDeliveryQuoteStatus("error");
        persistConfirmed({
          serviceType: "DELIVERY",
          deliveryMode: currentMode,
          deliveryAddress: addressWithPostal,
          deliveryQuote: invalidateDeliveryQuoteState(previousQuote, trimmed),
        });
        return false;
      } finally {
        setConfirming(false);
      }
    },
    [confirmed, draft.deliveryMode, draft.serviceType, persistConfirmed],
  );

  const confirmDeliveryPreorderDateFromCart = useCallback(
    async (dateKey: string): Promise<boolean> => {
      if (
        !confirmed ||
        confirmed.serviceType !== "DELIVERY" ||
        confirmed.deliveryMode !== "PREORDER"
      ) {
        setValidationError(DELIVERY_MESSAGES.noPreorderDates);
        return false;
      }
      const quoteStatus = resolveDeliveryQuoteStatus(confirmed.deliveryQuote);
      if (quoteStatus !== "PENDING" && quoteStatus !== "VALID") {
        setValidationError(DELIVERY_MESSAGES.unavailable);
        return false;
      }

      let systemWindow = deliveryWindowByDate[dateKey];
      if (!systemWindow) {
        setConfirming(true);
        try {
          const quote = await fetchDeliveryQuote({
            address: deliveryAddressForQuote(confirmed.deliveryAddress),
          });
          applyQuoteToDeliveryState(quote, {
            setDeliveryPreorderDateKeys,
            setDeliveryWindowByDate,
            setDeliveryQuoteStatus,
          });
          systemWindow = quote.windowByDate[dateKey];
        } catch (error: unknown) {
          setValidationError(
            errorMessage(error, DELIVERY_MESSAGES.unavailable),
          );
          return false;
        } finally {
          setConfirming(false);
        }
      }

      if (!systemWindow) {
        setValidationError(DELIVERY_MESSAGES.noPreorderWindow);
        return false;
      }

      persistConfirmed({
        ...confirmed,
        deliveryQuote: createValidDeliveryQuote({
          postalCode: confirmed.deliveryAddress.postalCode,
          zoneId: confirmed.deliveryQuote.zoneId,
          deliveryMode: "PREORDER",
          deliveryDate: dateKey,
          deliveryWindow: systemWindow,
          deliveryFee: confirmed.deliveryQuote.deliveryFee ?? 0,
          expiresAt: confirmed.deliveryQuote.expiresAt,
          createdAt: confirmed.deliveryQuote.createdAt,
        }),
      });
      setValidationError(null);
      return true;
    },
    [confirmed, deliveryWindowByDate, persistConfirmed],
  );

  const setConfirmedDeliveryModeFromCart = useCallback(
    (mode: "EARLIEST_AVAILABLE" | "PREORDER") => {
      setConfirmed((prev) => {
        if (!prev || prev.serviceType !== "DELIVERY") return prev;
        const next: ConfirmedPickup = {
          serviceType: "DELIVERY",
          deliveryMode: mode,
          deliveryAddress: prev.deliveryAddress,
          deliveryQuote: {
            ...invalidateDeliveryQuoteState(prev.deliveryQuote),
            deliveryMode: mode,
          },
        };
        writePersistedConfirmed(confirmedToPersisted(next));
        return next;
      });
      setDraft((prev) => ({
        ...prev,
        serviceType: "DELIVERY",
        deliveryMode: mode,
        dateKey: null,
        timeSlotId: null,
      }));
      clearDeliveryQuote();
      setValidationError(null);
    },
    [clearDeliveryQuote],
  );

  const resetSelection = useCallback(() => {
    persistConfirmed(null);
    setDraft(emptyDraft);
    clearAvailability();
    clearDeliveryQuote();
    setValidationError(null);
    setStep("service");
  }, [clearAvailability, clearDeliveryQuote, persistConfirmed]);

  const isPickupComplete = useMemo(() => {
    if (!confirmed) return false;
    if (confirmed.serviceType === "PICKUP") {
      return Boolean(
        confirmedSlotAvailable &&
          hasValidConfirmedPickupIds({
            boutiqueId: confirmed.boutique.id,
            dateKey: confirmed.dateKey,
            timeSlotId: confirmed.timeSlot.id,
          }),
      );
    }
    return isDeliveryFulfillmentComplete(confirmed);
  }, [confirmed, confirmedSlotAvailable]);

  const deliveryQuote = useMemo<DeliveryQuote | null>(() => {
    return confirmed?.serviceType === "DELIVERY" ? confirmed.deliveryQuote : null;
  }, [confirmed]);

  const value = useMemo<PickupContextValue>(
    () => ({
      isOpen,
      openPickupSelection,
      closePickupSelection,
      step,
      setStep,
      draft,
      setDraftServiceType,
      setDraftBoutique,
      setDraftDate,
      setDraftTimeSlot,
      setDraftDeliveryMode,
      setDraftDeliveryAddress,
      deliveryPostalInput,
      setDeliveryPostalInput,
      validationError,
      clearValidationError,
      confirmSelection,
      confirmDeliveryServiceOnly,
      applyDeliveryPostalFromCart,
      confirmDeliveryPreorderDateFromCart,
      setConfirmedDeliveryModeFromCart,
      confirming,
      confirmed,
      deliveryQuote,
      isPickupComplete,
      isFulfillmentComplete: isPickupComplete,
      confirmedSlotAvailable,
      resetSelection,
      clearConfirmedSlot,
      boutiques,
      boutiquesStatus,
      boutiquesError,
      reloadBoutiques,
      availableDateKeys,
      datesStatus,
      datesError,
      reloadDates,
      timeSlots,
      slotsStatus,
      slotsError,
      reloadSlots,
      deliveryQuoteStatus,
      deliveryQuoteError,
      deliveryPreorderDateKeys,
      deliveryWindowByDate,
      reloadDeliveryQuote,
      invalidateDeliveryQuote,
    }),
    [
      isOpen,
      openPickupSelection,
      closePickupSelection,
      step,
      draft,
      setDraftServiceType,
      setDraftBoutique,
      setDraftDate,
      setDraftTimeSlot,
      setDraftDeliveryMode,
      setDraftDeliveryAddress,
      deliveryPostalInput,
      setDeliveryPostalInput,
      validationError,
      clearValidationError,
      confirmSelection,
      confirmDeliveryServiceOnly,
      applyDeliveryPostalFromCart,
      confirmDeliveryPreorderDateFromCart,
      setConfirmedDeliveryModeFromCart,
      confirming,
      confirmed,
      deliveryQuote,
      isPickupComplete,
      confirmedSlotAvailable,
      resetSelection,
      clearConfirmedSlot,
      boutiques,
      boutiquesStatus,
      boutiquesError,
      reloadBoutiques,
      availableDateKeys,
      datesStatus,
      datesError,
      reloadDates,
      timeSlots,
      slotsStatus,
      slotsError,
      reloadSlots,
      deliveryQuoteStatus,
      deliveryQuoteError,
      deliveryPreorderDateKeys,
      deliveryWindowByDate,
      reloadDeliveryQuote,
      invalidateDeliveryQuote,
    ],
  );

  return (
    <PickupContext.Provider value={value}>{children}</PickupContext.Provider>
  );
}

export function usePickup() {
  const ctx = useContext(PickupContext);
  if (!ctx) {
    throw new Error("usePickup must be used within PickupProvider");
  }
  return ctx;
}
