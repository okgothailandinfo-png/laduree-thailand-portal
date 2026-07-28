"use client";

import { useId, useState } from "react";
import { usePickup } from "./PickupContext";
import { resolveDeliveryQuoteStatus, type DeliveryQuote } from "./delivery-quote";
import {
  DELIVERY_MESSAGES,
  hasValidDeliveryPostalCode,
} from "./pickup-availability";
import { formatPickupDateKey, formatPickupDateKeyLong } from "./pickup-dates";

function formatDeliveryTimeSummary(
  deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER",
  quote: DeliveryQuote,
): string {
  if (deliveryMode === "EARLIEST_AVAILABLE") {
    const relative = quote.relativeLabel ?? "";
    const window = quote.deliveryWindow?.label ?? "";
    return [relative, window].filter(Boolean).join(" · ");
  }
  const date = quote.deliveryDate ? formatPickupDateKeyLong(quote.deliveryDate) : "";
  const window = quote.deliveryWindow?.label ?? "";
  return [date, window].filter(Boolean).join(" · ");
}

function deliveryModeLabel(
  mode: "EARLIEST_AVAILABLE" | "PREORDER",
): string {
  return mode === "EARLIEST_AVAILABLE" ? "Earliest Delivery" : "Pre-order";
}

/** Cart fulfillment strip — Singapore #divPickupMyCart patterns. */
export default function CartFulfillmentStrip() {
  const postalInputId = useId();
  const {
    confirmed,
    isPickupComplete,
    openPickupSelection,
    applyDeliveryPostalFromCart,
    confirmDeliveryPreorderDateFromCart,
    deliveryPreorderDateKeys,
    deliveryWindowByDate,
    confirming,
    deliveryPostalInput,
    setDeliveryPostalInput,
    validationError,
  } = usePickup();

  const serviceType = confirmed?.serviceType ?? "PICKUP";
  const isDelivery = serviceType === "DELIVERY";
  const deliveryConfirmed =
    isDelivery && confirmed?.serviceType === "DELIVERY" ? confirmed : null;
  const deliveryQuote = deliveryConfirmed?.deliveryQuote ?? null;
  const quoteStatus = deliveryQuote
    ? resolveDeliveryQuoteStatus(deliveryQuote)
    : "EMPTY";

  const [preorderDraft, setPreorderDraft] = useState<string | null>(null);
  const pendingPreorderDate =
    preorderDraft ?? deliveryQuote?.deliveryDate ?? null;

  async function handleCheckAvailability() {
    await applyDeliveryPostalFromCart(deliveryPostalInput);
  }

  async function handleConfirmPreorderDate() {
    if (!pendingPreorderDate) return;
    const ok = await confirmDeliveryPreorderDateFromCart(pendingPreorderDate);
    if (ok) setPreorderDraft(null);
  }

  const postalAttempted = deliveryPostalInput.trim().length > 0;
  const hasValidatedPostal =
    Boolean(deliveryQuote) &&
    deliveryQuote?.postalCode === deliveryPostalInput &&
    hasValidDeliveryPostalCode(deliveryPostalInput);
  const zoneUnsupported = quoteStatus === "UNSUPPORTED";
  const isQuoteValid = quoteStatus === "VALID";
  const isPreorder = deliveryConfirmed?.deliveryMode === "PREORDER";
  const preorderNeedsDate =
    isPreorder && quoteStatus === "PENDING" && !deliveryQuote?.deliveryDate;
  const feeDisplay =
    typeof deliveryQuote?.deliveryFee === "number"
      ? deliveryQuote.deliveryFee
      : null;
  const showFee =
    feeDisplay !== null && (isQuoteValid || quoteStatus === "PENDING");
  const showUnavailableMessage = quoteStatus === "EXPIRED";
  const showRecheckHint =
    hasValidatedPostal &&
    !zoneUnsupported &&
    quoteStatus === "INVALID";

  return (
    <>
      <div className="tab-service-main">
        <button
          type="button"
          className={`tab-service-item${!isDelivery ? " active" : ""}`}
          onClick={() =>
            openPickupSelection({ step: "service", serviceType: "PICKUP" })
          }
        >
          Pick-up
        </button>
        <button
          type="button"
          className={`tab-service-item${isDelivery ? " active" : ""}`}
          onClick={() =>
            openPickupSelection({ step: "service", serviceType: "DELIVERY" })
          }
        >
          Delivery
        </button>
      </div>

      <div
        className={`bg-pink cart-fulfillment${isPickupComplete ? "" : " is-empty"}`}
      >
        {isPickupComplete && confirmed?.serviceType === "PICKUP" ? (
          <>
            <div className="cart-outlet">
              <span className="cart-outlet-name">
                {confirmed.boutique.name}
              </span>
              <span className="cart-outlet-address">
                {confirmed.boutique.address}
              </span>
            </div>
            <div className="cart-pickup-time">
              <span className="cart-pickup-label">Pickup Time</span>
              <span className="cart-pickup-values">
                {formatPickupDateKeyLong(confirmed.dateKey)}
                <br />
                {confirmed.timeSlot.start} To {confirmed.timeSlot.end}
              </span>
              <button
                type="button"
                className="cart-pickup-change"
                onClick={() =>
                  openPickupSelection({
                    step: "datetime",
                    serviceType: "PICKUP",
                  })
                }
              >
                Select a different date/time
              </button>
            </div>
          </>
        ) : deliveryConfirmed && deliveryQuote ? (
          <>
            <div className="cart-outlet">
              <span className="cart-outlet-name">
                {isQuoteValid
                  ? deliveryConfirmed.deliveryAddress.postalCode
                  : "Delivery"}
              </span>
              <span className="cart-outlet-address">
                {!postalAttempted
                  ? DELIVERY_MESSAGES.enterPostalInCart
                  : zoneUnsupported
                    ? DELIVERY_MESSAGES.addressUnavailable
                    : null}
              </span>
            </div>
            <div className="cart-pickup-time">
              <span className="cart-pickup-label">
                {deliveryModeLabel(deliveryConfirmed.deliveryMode)}
              </span>
              <button
                type="button"
                className="cart-pickup-change"
                onClick={() =>
                  openPickupSelection({
                    step: "mode",
                    serviceType: "DELIVERY",
                  })
                }
              >
                Change delivery mode
              </button>

              <div className="cart-delivery-postal">
                <label
                  className="cart-delivery-postal__label"
                  htmlFor={postalInputId}
                >
                  <span>Postal Code</span>
                  <input
                    id={postalInputId}
                    type="text"
                    name="deliveryPostalCode"
                    className="cart-delivery-postal__input"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="Delivery location postal code"
                    maxLength={5}
                    value={deliveryPostalInput}
                    onChange={(event) => {
                      setDeliveryPostalInput(event.target.value);
                    }}
                    data-testid="cart-delivery-postal-input"
                  />
                </label>
                <button
                  type="button"
                  className="cart-delivery-postal__btn"
                  data-testid="cart-delivery-check-availability"
                  disabled={
                    confirming ||
                    !hasValidDeliveryPostalCode(deliveryPostalInput)
                  }
                  onClick={() => {
                    void handleCheckAvailability();
                  }}
                >
                  Check availability
                </button>
              </div>

              {!postalAttempted ? (
                <span className="cart-pickup-incomplete" role="status">
                  {DELIVERY_MESSAGES.enterPostalInCart}
                </span>
              ) : null}

              {hasValidatedPostal && !zoneUnsupported ? (
                <>
                  {isQuoteValid ? (
                    <span className="cart-pickup-values">
                      Delivery Time:{" "}
                      {formatDeliveryTimeSummary(
                        deliveryConfirmed.deliveryMode,
                        deliveryQuote,
                      )}
                    </span>
                  ) : null}
                  {showFee ? (
                    <span className="cart-pickup-values">฿{feeDisplay}</span>
                  ) : null}
                </>
              ) : null}

              {showUnavailableMessage ? (
                <span className="cart-pickup-incomplete" role="status">
                  {DELIVERY_MESSAGES.quoteExpired}
                </span>
              ) : null}

              {showRecheckHint && !validationError ? (
                <span className="cart-pickup-incomplete" role="status">
                  {DELIVERY_MESSAGES.enterPostalInCart}
                </span>
              ) : null}

              {validationError ? (
                <span className="cart-pickup-incomplete" role="status">
                  {validationError}
                </span>
              ) : null}

              {preorderNeedsDate && deliveryPreorderDateKeys.length > 0 ? (
                <div className="cart-delivery-preorder">
                  <p className="pickup-datetime-label">Select Delivery Date</p>
                  <div className="pickup-date-chips" role="group">
                    {deliveryPreorderDateKeys.map((dateKey) => {
                      const selected = pendingPreorderDate === dateKey;
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          className={`pickup-date-chip${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => setPreorderDraft(dateKey)}
                        >
                          {formatPickupDateKey(dateKey)}
                        </button>
                      );
                    })}
                  </div>
                  {pendingPreorderDate &&
                  deliveryWindowByDate[pendingPreorderDate] ? (
                    <p className="pickup-slots-hint" role="status">
                      {deliveryWindowByDate[pendingPreorderDate].label}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="cart-delivery-postal__btn"
                    disabled={
                      confirming ||
                      !pendingPreorderDate ||
                      !deliveryWindowByDate[pendingPreorderDate ?? ""]
                    }
                    onClick={() => {
                      void handleConfirmPreorderDate();
                    }}
                  >
                    Confirm date
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="cart-outlet">
              <span className="cart-outlet-name">
                Select service, date and time
              </span>
            </div>
            <div className="cart-pickup-time">
              <span className="cart-pickup-label">Pickup Time</span>
              <span className="cart-pickup-incomplete">
                No pickup date/time selected
              </span>
              <button
                type="button"
                className="cart-pickup-change"
                onClick={() =>
                  openPickupSelection({ step: "service", serviceType: "PICKUP" })
                }
              >
                Select a different date/time
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
