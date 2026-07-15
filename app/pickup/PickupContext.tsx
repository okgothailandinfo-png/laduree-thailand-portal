"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MOCK_BOUTIQUE,
  MOCK_TIME_SLOTS,
  type MockBoutique,
  type MockTimeSlot,
} from "./mock-pickup";

export type PickupDraft = {
  boutiqueId: string | null;
  dateKey: string | null;
  timeSlotId: string | null;
};

export type ConfirmedPickup = {
  boutique: MockBoutique;
  dateKey: string;
  timeSlot: MockTimeSlot;
};

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
};

export type PickupStep = "service" | "boutique" | "datetime";

const PickupContext = createContext<PickupContextValue | null>(null);

const emptyDraft: PickupDraft = {
  boutiqueId: null,
  dateKey: null,
  timeSlotId: null,
};

export function PickupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<PickupStep>("service");
  const [draft, setDraft] = useState<PickupDraft>(emptyDraft);
  const [confirmed, setConfirmed] = useState<ConfirmedPickup | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const openPickupSelection = useCallback((opts?: { step?: PickupStep }) => {
    setValidationError(null);
    if (confirmed) {
      setDraft({
        boutiqueId: confirmed.boutique.id,
        dateKey: confirmed.dateKey,
        timeSlotId: confirmed.timeSlot.id,
      });
      setStep(opts?.step ?? "datetime");
    } else {
      setDraft(emptyDraft);
      setStep(opts?.step ?? "service");
    }
    setIsOpen(true);
  }, [confirmed]);

  const closePickupSelection = useCallback(() => {
    setIsOpen(false);
    setValidationError(null);
  }, []);

  const setDraftBoutique = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, boutiqueId: id }));
    setValidationError(null);
  }, []);

  const setDraftDate = useCallback((dateKey: string) => {
    setDraft((prev) => ({ ...prev, dateKey, timeSlotId: null }));
    setValidationError(null);
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
      draft.boutiqueId === MOCK_BOUTIQUE.id ? MOCK_BOUTIQUE : null;
    const timeSlot = MOCK_TIME_SLOTS.find((s) => s.id === draft.timeSlotId);

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
  }, [draft]);

  const resetSelection = useCallback(() => {
    setConfirmed(null);
    setDraft(emptyDraft);
    setValidationError(null);
    setStep("service");
  }, []);

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
