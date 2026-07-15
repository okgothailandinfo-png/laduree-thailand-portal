"use client";

import { useEffect, useId, useRef } from "react";
import { usePickup, type PickupStep } from "./PickupContext";
import {
  formatPickupDate,
  getMockPickupDates,
  MOCK_BOUTIQUE,
  MOCK_TIME_SLOTS,
  toDateKey,
} from "./mock-pickup";
import "./pickup.css";

const STEP_TITLES: Record<PickupStep, string> = {
  service: "SELECT YOUR DESIRED SERVICE",
  boutique: "Select Outlet To Pickup Order",
  datetime: "Choose Date & Time",
};

export default function PickupSelectionModal() {
  const {
    isOpen,
    closePickupSelection,
    step,
    setStep,
    draft,
    setDraftBoutique,
    setDraftDate,
    setDraftTimeSlot,
    validationError,
    confirmSelection,
  } = usePickup();

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dates = getMockPickupDates();

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(t);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePickupSelection();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closePickupSelection]);

  const canContinueService = true;
  const canContinueBoutique = draft.boutiqueId !== null;
  const canConfirm =
    draft.boutiqueId !== null &&
    draft.dateKey !== null &&
    draft.timeSlotId !== null;

  return (
    <div
      className={`pickup-modal-root${isOpen ? " is-open" : ""}`}
      aria-hidden={!isOpen}
      {...(!isOpen ? { inert: true } : {})}
    >
      <button
        type="button"
        className="pickup-modal-backdrop"
        aria-label="Close pickup selection"
        tabIndex={isOpen ? 0 : -1}
        onClick={closePickupSelection}
      />
      <div
        ref={panelRef}
        className="pickup-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="pickup-modal-header">
          <h2 id={titleId} className="pickup-modal-title">
            {STEP_TITLES[step]}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="pickup-modal-close"
            aria-label="Close"
            onClick={closePickupSelection}
          >
            ×
          </button>
        </div>

        <div className="pickup-modal-body">
          <p className="pickup-placeholder-note">
            Placeholder data only — boutique, address, dates, and time slots are
            not approved Thailand operational content.
          </p>

          {validationError ? (
            <div className="pickup-error" role="alert">
              {validationError}
            </div>
          ) : null}

          {step === "service" ? (
            <div className="pickup-service-grid">
              <button
                type="button"
                className="pickup-service-card is-selected"
                aria-pressed="true"
              >
                <span className="pickup-service-card__title">Pick-up</span>
                <span className="pickup-service-card__sub">
                  Order &amp; collect
                </span>
                <span className="pickup-service-card__sub">no queuing</span>
              </button>
              <button
                type="button"
                className="pickup-service-card"
                disabled
                aria-disabled="true"
                title="Delivery is not available in this sprint"
              >
                <span className="pickup-service-card__title">Delivery</span>
                <span className="pickup-service-card__sub">
                  Served to your doorstep
                </span>
                <span className="pickup-service-card__sub">
                  Not available yet
                </span>
              </button>
            </div>
          ) : null}

          {step === "boutique" ? (
            <ul className="pickup-outlet-list">
              <li>
                <button
                  type="button"
                  className={`pickup-outlet-item${
                    draft.boutiqueId === MOCK_BOUTIQUE.id ? " is-selected" : ""
                  }`}
                  aria-pressed={draft.boutiqueId === MOCK_BOUTIQUE.id}
                  onClick={() => setDraftBoutique(MOCK_BOUTIQUE.id)}
                >
                  <span className="pickup-outlet-item__name">
                    1. {MOCK_BOUTIQUE.name}
                  </span>
                  <span className="pickup-outlet-item__address">
                    {MOCK_BOUTIQUE.address}
                  </span>
                </button>
              </li>
            </ul>
          ) : null}

          {step === "datetime" ? (
            <>
              <div className="pickup-datetime-section">
                <p className="pickup-datetime-label" id="pickup-date-label">
                  Select Date
                </p>
                <div
                  className="pickup-date-chips"
                  role="group"
                  aria-labelledby="pickup-date-label"
                >
                  {dates.map((date) => {
                    const key = toDateKey(date);
                    const selected = draft.dateKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`pickup-date-chip${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => setDraftDate(key)}
                      >
                        {formatPickupDate(date)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pickup-datetime-section">
                <p className="pickup-datetime-label" id="pickup-slot-label">
                  Select Time slot
                </p>
                <div
                  className="pickup-slot-list"
                  role="group"
                  aria-labelledby="pickup-slot-label"
                >
                  {MOCK_TIME_SLOTS.map((slot) => {
                    const selected = draft.timeSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`pickup-slot-btn${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        disabled={!draft.dateKey}
                        onClick={() => setDraftTimeSlot(slot.id)}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="pickup-modal-footer">
          {step !== "service" ? (
            <button
              type="button"
              className="pickup-btn pickup-btn-secondary"
              onClick={() =>
                setStep(step === "datetime" ? "boutique" : "service")
              }
            >
              Back
            </button>
          ) : null}

          {step === "service" ? (
            <button
              type="button"
              className="pickup-btn"
              disabled={!canContinueService}
              onClick={() => setStep("boutique")}
            >
              Continue
            </button>
          ) : null}

          {step === "boutique" ? (
            <button
              type="button"
              className="pickup-btn"
              disabled={!canContinueBoutique}
              onClick={() => {
                if (!draft.boutiqueId) return;
                setStep("datetime");
              }}
            >
              Continue
            </button>
          ) : null}

          {step === "datetime" ? (
            <button
              type="button"
              className="pickup-btn"
              disabled={!canConfirm}
              onClick={() => {
                confirmSelection();
              }}
            >
              Confirm
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
