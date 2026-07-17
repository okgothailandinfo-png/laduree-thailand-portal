"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { submitCheckout } from "@/lib/api/checkout";
import { ApiClientError } from "@/lib/api/client";
import CatalogStatus from "../catalog/CatalogStatus";
import { useCart } from "../cart/CartContext";
import { usePickup } from "../pickup/PickupContext";
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

export default function CheckoutPageClient() {
  const router = useRouter();
  const { items, itemCount } = useCart();
  const { confirmed: pickup, isPickupComplete, openPickupSelection } =
    usePickup();
  const { info, setField, errors, confirmCheckoutInfo } = useCheckout();
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEmpty = items.length === 0;
  const canProceedToForm = !isEmpty && isPickupComplete;
  const isSubmitting = submitStatus === "loading";

  async function runCheckout() {
    if (!canProceedToForm || !pickup) return;
    if (!confirmCheckoutInfo()) return;

    const { firstName, lastName } = splitCustomerName(info.customerName);
    setSubmitStatus("loading");
    setSubmitError(null);

    try {
      const result = await submitCheckout({
        customer: {
          firstName,
          lastName,
          email: info.email.trim(),
          phone: info.mobileNumber.trim(),
        },
        pickup: {
          boutiqueId: pickup.boutique.id,
          pickupSlotId: pickup.timeSlot.id,
        },
      });
      setSubmitStatus("idle");
      router.push(`/payment?orderId=${encodeURIComponent(result.orderId)}`);
    } catch (error: unknown) {
      setSubmitStatus("error");
      setSubmitError(
        errorMessage(error, "Unable to create draft order. Please try again."),
      );
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canProceedToForm || isSubmitting) return;
    void runCheckout();
  }

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
            Your cart is empty.Add at least 1 item to checkout!{" "}
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
            <section className="checkout-card" aria-labelledby="checkout-pickup">
              <h2 id="checkout-pickup" className="checkout-card__title">
                Pick-up
              </h2>
              {pickup ? (
                <>
                  <p className="checkout-summary-meta">
                    {pickup.boutique.name}
                    <br />
                    {pickup.boutique.address}
                  </p>
                  <p className="checkout-summary-meta">
                    Pickup Time
                    <br />
                    {formatPickupDateKeyLong(pickup.dateKey)}
                    <br />
                    {pickup.timeSlot.start} To {pickup.timeSlot.end}
                  </p>
                </>
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
            </section>

            <section className="checkout-card" aria-labelledby="checkout-info">
              <h2 id="checkout-info" className="checkout-card__title">
                Checkout Information
              </h2>

              <form className="checkout-form" onSubmit={handleSubmit} noValidate>
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
                      errors.customerName ? "input-validation-error" : undefined
                    }
                    onChange={(e) => setField("customerName", e.target.value)}
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
                      errors.mobileNumber ? "input-validation-error" : undefined
                    }
                    onChange={(e) => setField("mobileNumber", e.target.value)}
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
                    aria-describedby={errors.email ? "email-error" : undefined}
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
                    onChange={(e) => setField("recipientName", e.target.value)}
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
                    onChange={(e) => setField("recipientPhone", e.target.value)}
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
                    onChange={(e) => setField("specialRequest", e.target.value)}
                  />
                </div>

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
                  <label htmlFor="termsAccepted">
                    Terms &amp; Conditions
                  </label>
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
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  Continue to Payment
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
