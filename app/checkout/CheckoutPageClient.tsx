"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { submitCheckout } from "@/lib/api/checkout";
import { ApiClientError } from "@/lib/api/client";
import { fetchPickupAvailability } from "@/lib/api/pickup";
import CatalogStatus from "../catalog/CatalogStatus";
import { CHECKOUT_BLOCKING_MESSAGES } from "../cart/checkout-eligibility";
import { useCart } from "../cart/CartContext";
import { usePickup } from "../pickup/PickupContext";
import {
  DELIVERY_POSTAL_RECALCULATE_MESSAGE,
  getCheckoutDeliveryView,
} from "./checkout-delivery-view";
import {
  formatFullDeliveryAddressInline,
} from "./delivery-address-form";
import { computeOrderTotals, formatOrderTotalThb } from "./order-totals";
import { PICKUP_MESSAGES, slotsContainId } from "../pickup/pickup-availability";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";
import { useCheckout } from "./CheckoutContext";
import "./checkout.css";

function splitCustomerName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function deliveryModeLabel(
  mode: "EARLIEST_AVAILABLE" | "PREORDER",
): string {
  return mode === "EARLIEST_AVAILABLE" ? "Earliest Delivery" : "Pre-order";
}

export default function CheckoutPageClient() {
  const router = useRouter();
  const { items, itemCount, subtotalThb } = useCart();
  const {
    confirmed: fulfillment,
    isPickupComplete,
    openPickupSelection,
    clearConfirmedSlot,
    invalidateDeliveryQuote,
  } = usePickup();
  const {
    identity,
    continueAsGuest,
    info,
    setField,
    setDeliveryAddressField,
    seedDeliveryPostal,
    errors,
    confirmCheckoutInfo,
  } = useCheckout();
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastInvalidatedPostalRef = useRef<string | null>(null);

  const isEmpty = items.length === 0;
  const canProceedToForm = !isEmpty && isPickupComplete;
  const showIdentityStep = canProceedToForm && identity === null;
  const showCheckoutForm = canProceedToForm && identity !== null;
  const isSubmitting = submitStatus === "loading";
  const isDelivery =
    fulfillment?.serviceType === "DELIVERY" && fulfillment !== null;

  /** Single source of truth for Delivery summary / banner / payment CTA. */
  const deliveryView = getCheckoutDeliveryView(
    isDelivery && fulfillment?.serviceType === "DELIVERY"
      ? fulfillment.deliveryQuote
      : null,
  );

  /** Form postal must match the quote postal — compare to deliveryQuote only. */
  const quotePostal = deliveryView.postalCode.trim();
  const formPostal = info.deliveryAddress.postalCode.trim();
  const postalMismatch =
    isDelivery &&
    deliveryView.isValid &&
    Boolean(quotePostal) &&
    Boolean(formPostal) &&
    formPostal !== quotePostal;

  const orderTotals = useMemo(
    () =>
      computeOrderTotals({
        serviceType: isDelivery ? "DELIVERY" : "PICKUP",
        subtotalThb,
        deliveryFeeThb: deliveryView.isValid ? deliveryView.deliveryFee : null,
      }),
    [isDelivery, subtotalThb, deliveryView.isValid, deliveryView.deliveryFee],
  );

  useEffect(() => {
    if (!quotePostal) return;
    seedDeliveryPostal(quotePostal);
  }, [quotePostal, seedDeliveryPostal]);

  useEffect(() => {
    if (!postalMismatch) {
      lastInvalidatedPostalRef.current = null;
      return;
    }
    if (lastInvalidatedPostalRef.current === formPostal) return;
    lastInvalidatedPostalRef.current = formPostal;
    // Invalidation clears date/window/fee — deliveryView then hides summary.
    // Buyer + compatible address fields in CheckoutInfo are preserved.
    invalidateDeliveryQuote();
  }, [postalMismatch, formPostal, invalidateDeliveryQuote]);

  async function runCheckout() {
    if (!canProceedToForm || !fulfillment || identity === null) return;

    if (isDelivery) {
      if (
        fulfillment.serviceType !== "DELIVERY" ||
        !deliveryView.canContinueToPayment ||
        postalMismatch
      ) {
        setSubmitStatus("error");
        setSubmitError(
          postalMismatch
            ? DELIVERY_POSTAL_RECALCULATE_MESSAGE
            : (deliveryView.bannerMessage ??
                CHECKOUT_BLOCKING_MESSAGES.deliveryUnavailable),
        );
        return;
      }
      if (!confirmCheckoutInfo({ requireDeliveryAddress: true })) return;
    } else if (!confirmCheckoutInfo()) {
      return;
    }

    const firstName = isDelivery
      ? info.firstName.trim()
      : splitCustomerName(info.customerName).firstName;
    const lastName = isDelivery
      ? info.lastName.trim()
      : splitCustomerName(info.customerName).lastName;

    setSubmitStatus("loading");
    setSubmitError(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    try {
      if (fulfillment.serviceType === "PICKUP") {
        const availability = await fetchPickupAvailability({
          boutiqueId: fulfillment.boutique.id,
          dateKey: fulfillment.dateKey,
        });
        if (!slotsContainId(availability.slots, fulfillment.timeSlot.id)) {
          clearConfirmedSlot(PICKUP_MESSAGES.checkoutStaleSlot);
          setSubmitStatus("error");
          setSubmitError(PICKUP_MESSAGES.checkoutStaleSlot);
          return;
        }
      }

      const checkoutBody =
        fulfillment.serviceType === "DELIVERY"
          ? {
              customer: {
                firstName,
                lastName,
                email: info.email.trim(),
                phone: info.mobileNumber.trim(),
              },
              serviceType: "DELIVERY" as const,
              delivery: {
                mode: fulfillment.deliveryMode,
                address: {
                  ...info.deliveryAddress,
                  recipient:
                    info.deliveryAddress.recipient.trim() ||
                    `${firstName} ${lastName}`.trim(),
                  phone:
                    info.deliveryAddress.phone.trim() ||
                    info.mobileNumber.trim(),
                  notes:
                    (info.deliveryAddress.notes ?? "").trim() ||
                    info.specialRequest.trim(),
                },
                ...(fulfillment.deliveryMode === "PREORDER" &&
                fulfillment.deliveryQuote.deliveryDate
                  ? { dateKey: fulfillment.deliveryQuote.deliveryDate }
                  : {}),
              },
              termsAccepted: info.termsAccepted === true,
            }
          : {
              customer: {
                firstName,
                lastName,
                email: info.email.trim(),
                phone: info.mobileNumber.trim(),
              },
              serviceType: "PICKUP" as const,
              pickup: {
                boutiqueId: fulfillment.boutique.id,
                dateKey: fulfillment.dateKey,
                pickupSlotId: fulfillment.timeSlot.id,
              },
              termsAccepted: info.termsAccepted === true,
            };

      const result = await submitCheckout(checkoutBody, {
        idempotencyKey: idempotencyKeyRef.current,
      });
      idempotencyKeyRef.current = null;
      setSubmitStatus("idle");
      router.push(`/payment?orderId=${encodeURIComponent(result.orderId)}`);
    } catch (error: unknown) {
      setSubmitStatus("error");
      const message = errorMessage(
        error,
        "Unable to create draft order. Please try again.",
      );
      if (
        fulfillment.serviceType === "PICKUP" &&
        error instanceof ApiClientError &&
        (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR") &&
        /pickup|slot|availability/i.test(error.message)
      ) {
        clearConfirmedSlot(PICKUP_MESSAGES.checkoutStaleSlot);
        setSubmitError(PICKUP_MESSAGES.checkoutStaleSlot);
        return;
      }
      setSubmitError(message);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!showCheckoutForm || isSubmitting) return;
    void runCheckout();
  }

  const customerDisplayName = isDelivery
    ? `${info.firstName} ${info.lastName}`.trim() || info.customerName
    : info.customerName;
  const deliveryNotes =
    (info.deliveryAddress.notes ?? "").trim() || info.specialRequest.trim();

  return (
    <main className="checkout-page">
      <div className="checkout-page__inner">
        <div className="checkout-page__top">
          <Link href="/" className="checkout-page__back">
            ← Back
          </Link>
        </div>

        <h1 className="checkout-page__title">Checkout</h1>

        {isEmpty ? (
          <div className="checkout-gate" role="alert">
            {CHECKOUT_BLOCKING_MESSAGES.emptyCart}{" "}
            <Link href="/">Home</Link>
          </div>
        ) : null}

        {!isEmpty && !isPickupComplete ? (
          <div className="checkout-gate" role="alert">
            Select service, date and time before checkout.{" "}
            <button
              type="button"
              onClick={() => openPickupSelection({ step: "service" })}
            >
              Select service, date and time
            </button>
          </div>
        ) : null}

        {canProceedToForm ? (
          <>
            <section
              className="checkout-card"
              aria-labelledby="checkout-fulfillment"
            >
              <h2 id="checkout-fulfillment" className="checkout-card__title">
                {isDelivery ? "Delivery" : "Pick-up"}
              </h2>
              {fulfillment ? (
                isDelivery ? (
                  <>
                    <p className="checkout-summary-meta">
                      {deliveryModeLabel(fulfillment.deliveryMode)}
                    </p>
                    {deliveryView.showSummary &&
                    deliveryView.deliveryDate &&
                    deliveryView.deliveryWindow ? (
                      <p className="checkout-summary-meta">
                        Delivery Time
                        <br />
                        {formatPickupDateKeyLong(deliveryView.deliveryDate)}
                        <br />
                        {deliveryView.deliveryWindow.start} To{" "}
                        {deliveryView.deliveryWindow.end}
                      </p>
                    ) : null}
                    {deliveryView.showSummary &&
                    typeof deliveryView.deliveryFee === "number" ? (
                      <p className="checkout-summary-meta">
                        Delivery Fee
                        <br />
                        {formatPriceThb(deliveryView.deliveryFee)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="checkout-summary-meta">
                      {fulfillment.boutique.name}
                      <br />
                      {fulfillment.boutique.address}
                    </p>
                    <p className="checkout-summary-meta">
                      Pickup Time
                      <br />
                      {formatPickupDateKeyLong(fulfillment.dateKey)}
                      <br />
                      {fulfillment.timeSlot.start} To {fulfillment.timeSlot.end}
                    </p>
                  </>
                )
              ) : null}
            </section>

            <section className="checkout-card" aria-labelledby="checkout-order">
              <h2 id="checkout-order" className="checkout-card__title">
                Item(s) Added ({itemCount})
              </h2>
              <ul className="checkout-summary-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name}
                      {item.modifiers.length > 0
                        ? ` — ${item.modifiers
                            .map((m) =>
                              m.quantity
                                ? `${m.quantity}× ${m.label}`
                                : m.label,
                            )
                            .join(", ")}`
                        : ""}
                    </span>
                    <span>× {item.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="checkout-totals" data-testid="checkout-totals">
                <div className="checkout-totals__row">
                  <span>Subtotal</span>
                  <span data-testid="checkout-subtotal">
                    {formatOrderTotalThb(orderTotals.subtotalThb)}
                  </span>
                </div>
                {isDelivery && typeof orderTotals.deliveryFeeThb === "number" ? (
                  <div className="checkout-totals__row">
                    <span>Delivery Fee</span>
                    <span data-testid="checkout-delivery-fee">
                      {formatOrderTotalThb(orderTotals.deliveryFeeThb)}
                    </span>
                  </div>
                ) : null}
                <div className="checkout-totals__row total">
                  <span>Total</span>
                  <span data-testid="checkout-total">
                    {formatOrderTotalThb(orderTotals.totalThb)}
                  </span>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {showIdentityStep ? (
          <section className="checkout-card" aria-labelledby="checkout-identity">
            <h2 id="checkout-identity" className="checkout-card__title">
              Checkout Information
            </h2>
            <div className="checkout-identity">
              <button
                type="button"
                className="checkout-identity__primary"
                onClick={continueAsGuest}
              >
                Continue as Guest
              </button>
              <button
                type="button"
                className="checkout-identity__secondary"
                disabled
                aria-disabled="true"
              >
                Member Login — [CONTENT PENDING APPROVAL]
              </button>
              <button
                type="button"
                className="checkout-identity__secondary"
                disabled
                aria-disabled="true"
              >
                Continue with LINE — [CONTENT PENDING APPROVAL]
              </button>
            </div>
          </section>
        ) : null}

        {showCheckoutForm ? (
          <section className="checkout-card" aria-labelledby="checkout-info">
            <h2 id="checkout-info" className="checkout-card__title">
              Checkout Information
            </h2>

            <form className="checkout-form" onSubmit={handleSubmit} noValidate>
              {isDelivery ? (
                <>
                  <div className="checkout-field">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={info.firstName}
                      aria-invalid={Boolean(errors.firstName)}
                      aria-describedby={
                        errors.firstName ? "firstName-error" : undefined
                      }
                      className={
                        errors.firstName ? "input-validation-error" : undefined
                      }
                      onChange={(e) => setField("firstName", e.target.value)}
                    />
                    {errors.firstName ? (
                      <p
                        id="firstName-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.firstName}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={info.lastName}
                      aria-invalid={Boolean(errors.lastName)}
                      aria-describedby={
                        errors.lastName ? "lastName-error" : undefined
                      }
                      className={
                        errors.lastName ? "input-validation-error" : undefined
                      }
                      onChange={(e) => setField("lastName", e.target.value)}
                    />
                    {errors.lastName ? (
                      <p
                        id="lastName-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.lastName}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={info.email}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                      className={
                        errors.email ? "input-validation-error" : undefined
                      }
                      onChange={(e) => setField("email", e.target.value)}
                    />
                    {errors.email ? (
                      <p
                        id="email-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="mobileNumber">Mobile Number</label>
                    <input
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={info.mobileNumber}
                      aria-invalid={Boolean(errors.mobileNumber)}
                      aria-describedby={
                        errors.mobileNumber ? "mobileNumber-error" : undefined
                      }
                      className={
                        errors.mobileNumber
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setField("mobileNumber", e.target.value)
                      }
                    />
                    {errors.mobileNumber ? (
                      <p
                        id="mobileNumber-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.mobileNumber}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryPostalCode">Postal Code</label>
                    <input
                      id="deliveryPostalCode"
                      name="deliveryPostalCode"
                      type="text"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      value={info.deliveryAddress.postalCode}
                      aria-invalid={
                        Boolean(errors.deliveryPostalCode) || postalMismatch
                      }
                      aria-describedby={
                        errors.deliveryPostalCode || postalMismatch
                          ? "deliveryPostalCode-error"
                          : undefined
                      }
                      className={
                        errors.deliveryPostalCode || postalMismatch
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setDeliveryAddressField("postalCode", e.target.value)
                      }
                    />
                    {errors.deliveryPostalCode || postalMismatch ? (
                      <p
                        id="deliveryPostalCode-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {postalMismatch
                          ? DELIVERY_POSTAL_RECALCULATE_MESSAGE
                          : errors.deliveryPostalCode}{" "}
                        {postalMismatch ||
                        deliveryView.status === "INVALID" ? (
                          <button
                            type="button"
                            className="checkout-inline-action"
                            onClick={() =>
                              openPickupSelection({ step: "address" })
                            }
                          >
                            Recalculate delivery
                          </button>
                        ) : null}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryProvince">Province</label>
                    <input
                      id="deliveryProvince"
                      name="deliveryProvince"
                      type="text"
                      autoComplete="address-level1"
                      value={info.deliveryAddress.province}
                      aria-invalid={Boolean(errors.deliveryProvince)}
                      aria-describedby={
                        errors.deliveryProvince
                          ? "deliveryProvince-error"
                          : undefined
                      }
                      className={
                        errors.deliveryProvince
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setDeliveryAddressField("province", e.target.value)
                      }
                    />
                    {errors.deliveryProvince ? (
                      <p
                        id="deliveryProvince-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.deliveryProvince}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryDistrict">District</label>
                    <input
                      id="deliveryDistrict"
                      name="deliveryDistrict"
                      type="text"
                      autoComplete="address-level2"
                      value={info.deliveryAddress.district}
                      aria-invalid={Boolean(errors.deliveryDistrict)}
                      aria-describedby={
                        errors.deliveryDistrict
                          ? "deliveryDistrict-error"
                          : undefined
                      }
                      className={
                        errors.deliveryDistrict
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setDeliveryAddressField("district", e.target.value)
                      }
                    />
                    {errors.deliveryDistrict ? (
                      <p
                        id="deliveryDistrict-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.deliveryDistrict}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliverySubdistrict">Subdistrict</label>
                    <input
                      id="deliverySubdistrict"
                      name="deliverySubdistrict"
                      type="text"
                      value={info.deliveryAddress.subdistrict}
                      aria-invalid={Boolean(errors.deliverySubdistrict)}
                      aria-describedby={
                        errors.deliverySubdistrict
                          ? "deliverySubdistrict-error"
                          : undefined
                      }
                      className={
                        errors.deliverySubdistrict
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setDeliveryAddressField("subdistrict", e.target.value)
                      }
                    />
                    {errors.deliverySubdistrict ? (
                      <p
                        id="deliverySubdistrict-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.deliverySubdistrict}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryStreetAddress">Street Address</label>
                    <input
                      id="deliveryStreetAddress"
                      name="deliveryStreetAddress"
                      type="text"
                      autoComplete="street-address"
                      value={info.deliveryAddress.address}
                      aria-invalid={Boolean(errors.deliveryStreetAddress)}
                      aria-describedby={
                        errors.deliveryStreetAddress
                          ? "deliveryStreetAddress-error"
                          : undefined
                      }
                      className={
                        errors.deliveryStreetAddress
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setDeliveryAddressField("address", e.target.value)
                      }
                    />
                    {errors.deliveryStreetAddress ? (
                      <p
                        id="deliveryStreetAddress-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.deliveryStreetAddress}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryBuilding">
                      Building / Village / Condominium{" "}
                      <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="deliveryBuilding"
                      name="deliveryBuilding"
                      type="text"
                      value={info.deliveryAddress.building ?? ""}
                      onChange={(e) =>
                        setDeliveryAddressField("building", e.target.value)
                      }
                    />
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryUnitFloor">
                      Unit / Floor{" "}
                      <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="deliveryUnitFloor"
                      name="deliveryUnitFloor"
                      type="text"
                      value={info.deliveryAddress.unitFloor ?? ""}
                      onChange={(e) =>
                        setDeliveryAddressField("unitFloor", e.target.value)
                      }
                    />
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="deliveryNotes">
                      Delivery Notes{" "}
                      <span className="optional">(optional)</span>
                    </label>
                    <textarea
                      id="deliveryNotes"
                      name="deliveryNotes"
                      value={info.deliveryAddress.notes ?? ""}
                      onChange={(e) =>
                        setDeliveryAddressField("notes", e.target.value)
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="checkout-field">
                    <label htmlFor="customerName">Customer Name</label>
                    <input
                      id="customerName"
                      name="customerName"
                      type="text"
                      autoComplete="name"
                      value={info.customerName}
                      aria-invalid={Boolean(errors.customerName)}
                      aria-describedby={
                        errors.customerName ? "customerName-error" : undefined
                      }
                      className={
                        errors.customerName
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setField("customerName", e.target.value)
                      }
                    />
                    {errors.customerName ? (
                      <p
                        id="customerName-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.customerName}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="mobileNumber">Mobile Number</label>
                    <input
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={info.mobileNumber}
                      aria-invalid={Boolean(errors.mobileNumber)}
                      aria-describedby={
                        errors.mobileNumber ? "mobileNumber-error" : undefined
                      }
                      className={
                        errors.mobileNumber
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setField("mobileNumber", e.target.value)
                      }
                    />
                    {errors.mobileNumber ? (
                      <p
                        id="mobileNumber-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.mobileNumber}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={info.email}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                      className={
                        errors.email ? "input-validation-error" : undefined
                      }
                      onChange={(e) => setField("email", e.target.value)}
                    />
                    {errors.email ? (
                      <p
                        id="email-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="recipientName">
                      Recipient Name{" "}
                      <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="recipientName"
                      name="recipientName"
                      type="text"
                      autoComplete="off"
                      value={info.recipientName}
                      onChange={(e) =>
                        setField("recipientName", e.target.value)
                      }
                    />
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="recipientPhone">
                      Recipient Phone{" "}
                      <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="recipientPhone"
                      name="recipientPhone"
                      type="tel"
                      autoComplete="off"
                      inputMode="tel"
                      value={info.recipientPhone}
                      aria-invalid={Boolean(errors.recipientPhone)}
                      aria-describedby={
                        errors.recipientPhone
                          ? "recipientPhone-error"
                          : undefined
                      }
                      className={
                        errors.recipientPhone
                          ? "input-validation-error"
                          : undefined
                      }
                      onChange={(e) =>
                        setField("recipientPhone", e.target.value)
                      }
                    />
                    {errors.recipientPhone ? (
                      <p
                        id="recipientPhone-error"
                        className="field-validation-error"
                        role="alert"
                      >
                        {errors.recipientPhone}
                      </p>
                    ) : null}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="specialRequest">
                      Special Request / Remarks{" "}
                      <span className="optional">(optional)</span>
                    </label>
                    <textarea
                      id="specialRequest"
                      name="specialRequest"
                      value={info.specialRequest}
                      onChange={(e) =>
                        setField("specialRequest", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              <p className="checkout-legal-note">
                Terms and conditions legal text: [CONTENT PENDING APPROVAL]
              </p>

              <div className="checkout-terms">
                <input
                  id="termsAccepted"
                  name="termsAccepted"
                  type="checkbox"
                  checked={info.termsAccepted}
                  aria-invalid={Boolean(errors.termsAccepted)}
                  aria-describedby={
                    errors.termsAccepted ? "termsAccepted-error" : undefined
                  }
                  onChange={(e) => setField("termsAccepted", e.target.checked)}
                />
                <label htmlFor="termsAccepted">Terms &amp; Conditions</label>
              </div>
              {errors.termsAccepted ? (
                <p
                  id="termsAccepted-error"
                  className="field-validation-error"
                  role="alert"
                >
                  {errors.termsAccepted}
                </p>
              ) : null}

              {isDelivery &&
              deliveryView.showUnavailableBanner &&
              !postalMismatch ? (
                <div className="checkout-gate" role="alert">
                  {deliveryView.bannerMessage ??
                    CHECKOUT_BLOCKING_MESSAGES.deliveryUnavailable}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      openPickupSelection({
                        step:
                          fulfillment?.serviceType === "DELIVERY" &&
                          fulfillment.deliveryMode === "PREORDER"
                            ? "datetime"
                            : deliveryView.status === "INVALID" ||
                                deliveryView.status === "EMPTY"
                              ? "address"
                              : "mode",
                      })
                    }
                  >
                    Recalculate delivery
                  </button>
                </div>
              ) : null}

              {isDelivery &&
              deliveryView.canContinueToPayment &&
              customerDisplayName &&
              info.mobileNumber.trim() &&
              info.email.trim() &&
              info.deliveryAddress.province.trim() &&
              info.deliveryAddress.district.trim() &&
              info.deliveryAddress.subdistrict.trim() &&
              info.deliveryAddress.address.trim() ? (
                <section
                  className="checkout-order-review"
                  aria-labelledby="checkout-order-review"
                  data-testid="checkout-order-review"
                >
                  <h3
                    id="checkout-order-review"
                    className="checkout-order-review__title"
                  >
                    Order Review
                  </h3>
                  <p className="checkout-summary-meta">
                    Customer Name: {customerDisplayName}
                    <br />
                    Mobile Number: {info.mobileNumber.trim()}
                    <br />
                    Email: {info.email.trim()}
                  </p>
                  <p className="checkout-summary-meta">
                    Full Delivery Address
                    <br />
                    {formatFullDeliveryAddressInline({
                      ...info.deliveryAddress,
                      postalCode:
                        deliveryView.postalCode ||
                        info.deliveryAddress.postalCode,
                    })}
                  </p>
                  <p className="checkout-summary-meta">
                    Delivery Mode:{" "}
                    {deliveryModeLabel(fulfillment!.deliveryMode)}
                    {deliveryView.deliveryDate ? (
                      <>
                        <br />
                        Delivery Date:{" "}
                        {formatPickupDateKeyLong(deliveryView.deliveryDate)}
                      </>
                    ) : null}
                    {deliveryView.deliveryWindow ? (
                      <>
                        <br />
                        Delivery Window: {deliveryView.deliveryWindow.start} To{" "}
                        {deliveryView.deliveryWindow.end}
                      </>
                    ) : null}
                  </p>
                  <div className="checkout-totals">
                    <div className="checkout-totals__row">
                      <span>Subtotal</span>
                      <span>{formatOrderTotalThb(orderTotals.subtotalThb)}</span>
                    </div>
                    {typeof orderTotals.deliveryFeeThb === "number" ? (
                      <div className="checkout-totals__row">
                        <span>Delivery Fee</span>
                        <span>
                          {formatOrderTotalThb(orderTotals.deliveryFeeThb)}
                        </span>
                      </div>
                    ) : null}
                    <div className="checkout-totals__row total">
                      <span>Total</span>
                      <span>{formatOrderTotalThb(orderTotals.totalThb)}</span>
                    </div>
                  </div>
                  {deliveryNotes ? (
                    <p className="checkout-summary-meta">
                      Delivery Notes: {deliveryNotes}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {submitStatus === "loading" || submitStatus === "error" ? (
                <div className="checkout-submit-status">
                  <CatalogStatus
                    status={submitStatus === "loading" ? "loading" : "error"}
                    errorMessage={submitError}
                    onRetry={
                      submitStatus === "error"
                        ? () => void runCheckout()
                        : undefined
                    }
                  />
                </div>
              ) : null}

              <button
                type="submit"
                className="checkout-submit"
                disabled={
                  isSubmitting ||
                  (isDelivery && !deliveryView.canContinueToPayment)
                }
                aria-busy={isSubmitting}
              >
                Continue to Payment
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
