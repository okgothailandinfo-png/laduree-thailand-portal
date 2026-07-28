"use client";

import { useEffect, useId, useRef } from "react";
import CatalogStatus from "../catalog/CatalogStatus";
import DeliveryModeSelector from "./DeliveryModeSelector";
import PickupOutletList from "./PickupOutletList";
import { usePickup, type PickupStep } from "./PickupContext";
import {
  DELIVERY_MESSAGES,
  hasValidDeliveryPostalCode,
  PICKUP_MESSAGES,
} from "./pickup-availability";
import { formatPickupDateKey } from "./pickup-dates";
import ServiceSegmentedControl from "./ServiceSegmentedControl";
import "./pickup.css";

const STEP_TITLES: Record<PickupStep, string> = {
  service: "SELECT YOUR DESIRED SERVICE",
  address: "Please input the postal code for delivery",
  mode: "Select Delivery Option",
  boutique: "Select Outlet To Pickup Order",
  datetime: "Choose Date & Time",
};

const ADDRESS_FIELDS = [
  {
    key: "postalCode",
    label: "Postal Code",
    autoComplete: "postal-code",
    placeholder: "Delivery location postal code",
    prominent: true,
  },
  { key: "recipient", label: "Recipient", autoComplete: "name" },
  { key: "phone", label: "Phone", autoComplete: "tel" },
  { key: "address", label: "Address", autoComplete: "street-address" },
  { key: "subdistrict", label: "Subdistrict", autoComplete: "address-level3" },
  { key: "district", label: "District", autoComplete: "address-level2" },
  { key: "province", label: "Province", autoComplete: "address-level1" },
] as const;

function BackArrowIcon() {
  return (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 14L8.41 12.59L3.83 8H20V6H3.83L8.42 1.41L7 0L0 7L7 14Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PickupSelectionModal() {
  const {
    isOpen,
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
    validationError,
    confirmSelection,
    confirmDeliveryServiceOnly,
    confirming,
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
  } = usePickup();

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  const isDelivery = draft.serviceType === "DELIVERY";
  const isPreorder = isDelivery && draft.deliveryMode === "PREORDER";

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => backRef.current?.focus(), 0);
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

  const canContinueAddress = hasValidDeliveryPostalCode(
    draft.deliveryAddress.postalCode,
  );
  const canContinueBoutique = draft.boutiqueId !== null;

  const canConfirmPickup =
    draft.boutiqueId !== null &&
    draft.dateKey !== null &&
    draft.timeSlotId !== null &&
    timeSlots.some((slot) => slot.id === draft.timeSlotId);

  const canConfirmPreorderDelivery =
    draft.dateKey !== null &&
    Boolean(draft.dateKey && deliveryWindowByDate[draft.dateKey]);

  const canContinueService =
    draft.serviceType === "PICKUP"
      ? draft.boutiqueId !== null
      : true;

  function goBack() {
    if (step === "datetime") {
      setStep(isDelivery ? "mode" : "service");
      return;
    }
    if (step === "mode") {
      setStep("service");
      return;
    }
    if (step === "boutique") {
      setStep("service");
      return;
    }
    if (step === "address") {
      setStep("service");
      return;
    }
    closePickupSelection();
  }

  function continueFromService() {
    if (draft.serviceType === "DELIVERY") {
      confirmDeliveryServiceOnly();
      return;
    }
    if (!draft.boutiqueId) return;
    setStep("datetime");
  }

  function continueFromAddress() {
    if (!hasValidDeliveryPostalCode(draft.deliveryAddress.postalCode)) {
      return;
    }
    setStep("mode");
    reloadDeliveryQuote();
  }

  function continueFromMode() {
    confirmDeliveryServiceOnly();
  }

  const dateLabel = isDelivery ? "Select Delivery Date" : "Select Date";
  const timeLabel = "Select Time slot";
  const showPickupTimeSlots = !isDelivery;

  const dateKeys = isDelivery ? deliveryPreorderDateKeys : availableDateKeys;
  const dateKeysStatus = isDelivery ? deliveryQuoteStatus : datesStatus;
  const dateKeysError = isDelivery ? deliveryQuoteError : datesError;
  const pickupSlots = timeSlots;
  const pickupSlotsStatus = slotsStatus;
  const pickupSlotsError = slotsError;
  const preorderWindow =
    isPreorder && draft.dateKey
      ? (deliveryWindowByDate[draft.dateKey] ?? null)
      : null;

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
          <button
            ref={backRef}
            type="button"
            className="pickup-modal-back"
            aria-label={step === "service" ? "Close" : "Back"}
            onClick={goBack}
          >
            <BackArrowIcon />
          </button>
          <h2 id={titleId} className="pickup-modal-title">
            {STEP_TITLES[step]}
          </h2>
          <button
            type="button"
            className="pickup-modal-close"
            aria-label="Close"
            onClick={closePickupSelection}
          >
            ×
          </button>
        </div>

        <div className="pickup-modal-body">
          {validationError ? (
            <div className="pickup-error" role="alert">
              {validationError}
            </div>
          ) : null}

          {step === "service" ? (
            <div className="service-selection">
              <ServiceSegmentedControl
                value={draft.serviceType}
                onChange={setDraftServiceType}
              />

              {draft.serviceType === "PICKUP" ? (
                <div
                  id="service-panel-pickup"
                  role="tabpanel"
                  aria-labelledby="service-tab-pickup"
                  className="service-selection__panel"
                >
                  <h3 className="service-selection__heading">
                    Select Outlet To Pickup Order
                  </h3>
                  <PickupOutletList
                    boutiques={boutiques}
                    selectedId={draft.boutiqueId}
                    onSelect={setDraftBoutique}
                    status={boutiquesStatus}
                    errorMessage={boutiquesError}
                    onRetry={reloadBoutiques}
                  />
                </div>
              ) : (
                <div
                  id="service-panel-delivery"
                  role="tabpanel"
                  aria-labelledby="service-tab-delivery"
                  className="service-selection__panel"
                >
                  <h3 className="service-selection__heading">
                    Select Delivery Option
                  </h3>
                  <DeliveryModeSelector
                    value={draft.deliveryMode}
                    onChange={setDraftDeliveryMode}
                  />
                  <p className="pickup-slots-hint" role="status">
                    {DELIVERY_MESSAGES.enterPostalInCart}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {step === "address" ? (
            <div className="pickup-address-form">
              {ADDRESS_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className={`pickup-address-field${
                    "prominent" in field && field.prominent
                      ? " pickup-address-field--prominent"
                      : ""
                  }`}
                >
                  <span className="pickup-address-field__label">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    className="pickup-address-field__input"
                    autoComplete={field.autoComplete}
                    placeholder={
                      "placeholder" in field ? field.placeholder : undefined
                    }
                    value={draft.deliveryAddress[field.key]}
                    onChange={(event) =>
                      setDraftDeliveryAddress({
                        [field.key]: event.target.value,
                      })
                    }
                  />
                </label>
              ))}
              {!hasValidDeliveryPostalCode(draft.deliveryAddress.postalCode) ? (
                <p className="pickup-slots-hint" role="status">
                  {DELIVERY_MESSAGES.postalRequired}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "mode" ? (
            <div className="pickup-mode-form">
              <DeliveryModeSelector
                value={draft.deliveryMode}
                onChange={setDraftDeliveryMode}
              />
              {deliveryQuoteStatus === "loading" ? (
                <CatalogStatus status="loading" />
              ) : deliveryQuoteStatus === "error" ? (
                <CatalogStatus
                  status="error"
                  errorMessage={
                    deliveryQuoteError ?? DELIVERY_MESSAGES.unavailable
                  }
                  onRetry={reloadDeliveryQuote}
                />
              ) : (
                <p className="pickup-slots-hint" role="status">
                  {DELIVERY_MESSAGES.enterPostalInCart}
                </p>
              )}
            </div>
          ) : null}

          {step === "boutique" ? (
            <div className="service-selection__panel">
              <PickupOutletList
                boutiques={boutiques}
                selectedId={draft.boutiqueId}
                onSelect={setDraftBoutique}
                status={boutiquesStatus}
                errorMessage={boutiquesError}
                onRetry={reloadBoutiques}
              />
            </div>
          ) : null}

          {step === "datetime" ? (
            !isDelivery && !draft.boutiqueId ? (
              <div className="pickup-error" role="alert">
                {PICKUP_MESSAGES.missingBoutique}
              </div>
            ) : (
              <>
                <div className="pickup-datetime-section">
                  <p className="pickup-datetime-label" id="pickup-date-label">
                    {dateLabel}
                  </p>
                  {dateKeysStatus === "idle" ? (
                    <p className="pickup-slots-hint" role="status">
                      {isDelivery
                        ? DELIVERY_MESSAGES.noPreorderDates
                        : PICKUP_MESSAGES.missingBoutique}
                    </p>
                  ) : dateKeysStatus === "loading" ||
                    dateKeysStatus === "error" ||
                    dateKeysStatus === "empty" ? (
                    <CatalogStatus
                      status={dateKeysStatus}
                      errorMessage={
                        dateKeysError ??
                        (isDelivery
                          ? DELIVERY_MESSAGES.noPreorderDates
                          : PICKUP_MESSAGES.datesFailed)
                      }
                      emptyMessage={
                        isDelivery
                          ? DELIVERY_MESSAGES.noPreorderDates
                          : PICKUP_MESSAGES.noDates
                      }
                      onRetry={
                        isDelivery ? reloadDeliveryQuote : reloadDates
                      }
                    />
                  ) : (
                    <div
                      className="pickup-date-chips"
                      role="group"
                      aria-labelledby="pickup-date-label"
                    >
                      {dateKeys.map((dateKey) => {
                        const selected = draft.dateKey === dateKey;
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            className={`pickup-date-chip${selected ? " is-selected" : ""}`}
                            aria-pressed={selected}
                            onClick={() => setDraftDate(dateKey)}
                          >
                            {formatPickupDateKey(dateKey)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isPreorder && draft.dateKey ? (
                  preorderWindow ? (
                    <p className="pickup-slots-hint" role="status">
                      {preorderWindow.label}
                    </p>
                  ) : (
                    <p className="pickup-slots-hint" role="status">
                      {DELIVERY_MESSAGES.noPreorderWindow}
                    </p>
                  )
                ) : null}

                {showPickupTimeSlots ? (
                  <div className="pickup-datetime-section">
                    <p className="pickup-datetime-label" id="pickup-slot-label">
                      {timeLabel}
                    </p>
                    {!draft.dateKey ? (
                      <p className="pickup-slots-hint" role="status">
                        Select a date to load time slots.
                      </p>
                    ) : pickupSlotsStatus === "idle" ||
                      pickupSlotsStatus === "loading" ||
                      pickupSlotsStatus === "error" ||
                      pickupSlotsStatus === "empty" ? (
                      <CatalogStatus
                        status={
                          pickupSlotsStatus === "idle"
                            ? "loading"
                            : pickupSlotsStatus
                        }
                        errorMessage={
                          pickupSlotsError ?? PICKUP_MESSAGES.slotsFailed
                        }
                        emptyMessage={PICKUP_MESSAGES.noSlots}
                        onRetry={reloadSlots}
                      />
                    ) : (
                      <div
                        className="pickup-slot-list"
                        role="group"
                        aria-labelledby="pickup-slot-label"
                      >
                        {pickupSlots.map((slot) => {
                          const selected = draft.timeSlotId === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              className={`pickup-slot-btn${selected ? " is-selected" : ""}`}
                              aria-pressed={selected}
                              onClick={() => setDraftTimeSlot(slot.id)}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )
          ) : null}
        </div>

        <div className="pickup-modal-footer">
          {step === "service" ? (
            <button
              type="button"
              className="pickup-btn"
              disabled={!canContinueService || confirming}
              onClick={continueFromService}
            >
              {draft.serviceType === "DELIVERY" ? "Confirm" : "Continue"}
            </button>
          ) : null}

          {step === "address" ? (
            <button
              type="button"
              className="pickup-btn"
              disabled={!canContinueAddress}
              onClick={continueFromAddress}
            >
              Continue
            </button>
          ) : null}

          {step === "mode" ? (
            <button
              type="button"
              className="pickup-btn"
              disabled={confirming}
              onClick={continueFromMode}
            >
              Confirm
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
              disabled={
                confirming ||
                (isPreorder
                  ? !canConfirmPreorderDelivery
                  : !canConfirmPickup)
              }
              onClick={() => {
                void confirmSelection();
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
