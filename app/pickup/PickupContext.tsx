"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiClientError } from "@/lib/api/client";
import { fetchBoutiques } from "@/lib/api/catalog";
import { fetchPickupAvailability } from "@/lib/api/pickup";
import type { Boutique, PickupTimeSlot } from "@/lib/api/types";
import { getCandidateDateKeys } from "./pickup-dates";

export type PickupDraft = {
  boutiqueId: string | null;
  dateKey: string | null;
  timeSlotId: string | null;
};

export type ConfirmedPickup = {
  boutique: Boutique;
  dateKey: string;
  timeSlot: PickupTimeSlot;
};

export type AsyncStatus = "idle" | "loading" | "success" | "error" | "empty";

type PickupContextValue = {
  isOpen: boolean;
  openPickupSelection: (opts?: { step?: PickupStep }) => void;
  closePickupSelection: () => void;
  step: PickupStep;
  setStep: (step: PickupStep) => void;
  draft: PickupDraft;
  setDraftBoutique: (id: string) => void;
  setDraftDate: (dateKey: string) => void;
  setDraftTimeSlot: (slotId: string) => void;
  validationError: string | null;
  clearValidationError: () => void;
  confirmSelection: () => boolean;
  confirmed: ConfirmedPickup | null;
  isPickupComplete: boolean;
  resetSelection: () => void;
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
};

export type PickupStep = "service" | "boutique" | "datetime";

const PickupContext = createContext<PickupContextValue | null>(null);

const emptyDraft: PickupDraft = {
  boutiqueId: null,
  dateKey: null,
  timeSlotId: null,
};

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function PickupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<PickupStep>("service");
  const [draft, setDraft] = useState<PickupDraft>(emptyDraft);
  const [confirmed, setConfirmed] = useState<ConfirmedPickup | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
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

  const clearAvailability = useCallback(() => {
    setAvailableDateKeys([]);
    setDatesStatus("idle");
    setDatesError(null);
    setTimeSlots([]);
    setSlotsStatus("idle");
    setSlotsError(null);
  }, []);

  const reloadBoutiques = useCallback(() => {
    setBoutiquesStatus("loading");
    setBoutiquesError(null);
    setBoutiquesReloadToken((value) => value + 1);
  }, []);

  const reloadDates = useCallback(() => {
    if (!draft.boutiqueId) return;
    setDatesStatus("loading");
    setDatesError(null);
    setDatesReloadToken((value) => value + 1);
  }, [draft.boutiqueId]);

  const reloadSlots = useCallback(() => {
    if (!draft.boutiqueId || !draft.dateKey) return;
    setSlotsStatus("loading");
    setSlotsError(null);
    setSlotsReloadToken((value) => value + 1);
  }, [draft.boutiqueId, draft.dateKey]);

  useEffect(() => {
    const controller = new AbortController();

    fetchBoutiques({ signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return;
        setBoutiques(rows);
        setBoutiquesStatus(rows.length === 0 ? "empty" : "success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBoutiques([]);
        setBoutiquesError(errorMessage(error, "Unable to load boutiques."));
        setBoutiquesStatus("error");
      });

    return () => controller.abort();
  }, [boutiquesReloadToken]);

  // Probe candidate dates via the availability API for the selected boutique.
  useEffect(() => {
    const boutiqueId = draft.boutiqueId;
    if (!boutiqueId) return;

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
        setDraft((prev) => {
          if (!prev.dateKey || keys.includes(prev.dateKey)) return prev;
          return { ...prev, dateKey: null, timeSlotId: null };
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailableDateKeys([]);
        setDatesError(errorMessage(error, "Unable to load pickup dates."));
        setDatesStatus("error");
      });

    return () => controller.abort();
  }, [draft.boutiqueId, datesReloadToken]);

  // Load time slots for the selected boutique + date.
  useEffect(() => {
    const boutiqueId = draft.boutiqueId;
    const dateKey = draft.dateKey;
    if (!boutiqueId || !dateKey) return;

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
        setDraft((prev) => {
          if (!prev.timeSlotId) return prev;
          if (slots.some((slot) => slot.id === prev.timeSlotId)) return prev;
          return { ...prev, timeSlotId: null };
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTimeSlots([]);
        setSlotsError(errorMessage(error, "Unable to load time slots."));
        setSlotsStatus("error");
      });

    return () => controller.abort();
  }, [draft.boutiqueId, draft.dateKey, slotsReloadToken]);

  const openPickupSelection = useCallback(
    (opts?: { step?: PickupStep }) => {
      setValidationError(null);
      if (confirmed) {
        setDraft({
          boutiqueId: confirmed.boutique.id,
          dateKey: confirmed.dateKey,
          timeSlotId: confirmed.timeSlot.id,
        });
        setAvailableDateKeys([]);
        setDatesStatus("loading");
        setDatesError(null);
        setTimeSlots([]);
        setSlotsStatus("loading");
        setSlotsError(null);
        setStep(opts?.step ?? "datetime");
      } else {
        setDraft(emptyDraft);
        clearAvailability();
        setStep(opts?.step ?? "service");
      }
      setIsOpen(true);
    },
    [clearAvailability, confirmed],
  );

  const closePickupSelection = useCallback(() => {
    setIsOpen(false);
    setValidationError(null);
  }, []);

  const setDraftBoutique = useCallback((id: string) => {
    let changed = false;
    setDraft((prev) => {
      if (prev.boutiqueId === id) return prev;
      changed = true;
      return { boutiqueId: id, dateKey: null, timeSlotId: null };
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
    setDraft((prev) => {
      if (prev.dateKey === dateKey) return prev;
      changed = true;
      return { ...prev, dateKey, timeSlotId: null };
    });
    setValidationError(null);
    if (!changed) return;
    setTimeSlots([]);
    setSlotsStatus("loading");
    setSlotsError(null);
  }, []);

  const setDraftTimeSlot = useCallback((slotId: string) => {
    setDraft((prev) => ({ ...prev, timeSlotId: slotId }));
    setValidationError(null);
  }, []);

  const clearValidationError = useCallback(() => {
    setValidationError(null);
  }, []);

  const confirmSelection = useCallback(() => {
    if (!draft.boutiqueId) {
      setValidationError("Please select an outlet to continue.");
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

    setConfirmed({
      boutique,
      dateKey: draft.dateKey,
      timeSlot,
    });
    setValidationError(null);
    setIsOpen(false);
    return true;
  }, [boutiques, draft, timeSlots]);

  const resetSelection = useCallback(() => {
    setConfirmed(null);
    setDraft(emptyDraft);
    clearAvailability();
    setValidationError(null);
    setStep("service");
  }, [clearAvailability]);

  const value = useMemo<PickupContextValue>(
    () => ({
      isOpen,
      openPickupSelection,
      closePickupSelection,
      step,
      setStep,
      draft,
      setDraftBoutique,
      setDraftDate,
      setDraftTimeSlot,
      validationError,
      clearValidationError,
      confirmSelection,
      confirmed,
      isPickupComplete: confirmed !== null,
      resetSelection,
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
    }),
    [
      isOpen,
      openPickupSelection,
      closePickupSelection,
      step,
      draft,
      setDraftBoutique,
      setDraftDate,
      setDraftTimeSlot,
      validationError,
      clearValidationError,
      confirmSelection,
      confirmed,
      resetSelection,
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
