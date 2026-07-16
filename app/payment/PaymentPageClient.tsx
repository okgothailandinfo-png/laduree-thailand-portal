"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useCart } from "../cart/CartContext";
import { useCheckout } from "../checkout/CheckoutContext";
import {
  MOCK_PAYMENT_METHOD_LABELS,
  useOrderFlow,
  type MockPaymentMethod,
} from "../order/OrderFlowContext";
import { usePickup } from "../pickup/PickupContext";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";
import "./payment.css";

type CardDraft = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type PaymentErrors = Partial<
  Record<"method" | keyof CardDraft | "form", string>
>;

const emptyCard: CardDraft = {
  cardholderName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
};

export default function PaymentPageClient() {
  const router = useRouter();
  const { items, itemCount } = useCart();
  const { confirmed: checkout, isCheckoutInfoComplete } = useCheckout();
  const { confirmed: pickup, isPickupComplete, openPickupSelection } =
    usePickup();
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    placeMockOrder,
  } = useOrderFlow();

  const [method, setMethod] = useState<MockPaymentMethod | null>(
    selectedPaymentMethod,
  );
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [errors, setErrors] = useState<PaymentErrors>({});

  const isEmpty = items.length === 0;
  const canPay =
    !isEmpty && isPickupComplete && isCheckoutInfoComplete && !!checkout;

  const customer = useMemo(() => checkout, [checkout]);

  function setCardField<K extends keyof CardDraft>(key: K, value: string) {
    setCard((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key] && !current.form) return current;
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function selectMethod(next: MockPaymentMethod) {
    setMethod(next);
    setSelectedPaymentMethod(next);
    setErrors((current) => {
      if (!current.method && !current.form) return current;
      const cleared = { ...current };
      delete cleared.method;
      delete cleared.form;
      return cleared;
    });
  }

  function validatePayment(): boolean {
    const next: PaymentErrors = {};
    if (!method) {
      next.method = "Please select a payment method.";
    }

    if (method === "credit-card") {
      if (!card.cardholderName.trim()) {
        next.cardholderName = "Cardholder name is required.";
      }
      if (!card.cardNumber.trim()) {
        next.cardNumber = "Card number is required.";
      }
      if (!card.expiry.trim()) {
        next.expiry = "Expiry is required.";
      }
      if (!card.cvv.trim()) {
        next.cvv = "CVV is required.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handlePlaceOrder(event: FormEvent) {
    event.preventDefault();
    if (!canPay || !method) return;
    if (!validatePayment()) return;
    // Local mock only — no gateway, API, or charge.
    placeMockOrder(method);
    router.push("/order-confirmation");
  }

  return (
    <main className="payment-page">
      <div className="payment-page__inner">
        <div className="payment-page__top">
          <Link href="/checkout" className="payment-page__back">
            ← Back
          </Link>
        </div>

        <h1 className="payment-page__title">Payment</h1>

        {isEmpty ? (
          <div className="payment-gate" role="alert">
            Your cart is empty.Add at least 1 item to checkout!{" "}
            <Link href="/">Home</Link>
          </div>
        ) : null}

        {!isEmpty && !isPickupComplete ? (
          <div className="payment-gate" role="alert">
            Select service, date and time before payment.{" "}
            <button
              type="button"
              onClick={() => openPickupSelection({ step: "service" })}
            >
              Select service, date and time
            </button>
          </div>
        ) : null}

        {!isEmpty && isPickupComplete && !isCheckoutInfoComplete ? (
          <div className="payment-gate" role="alert">
            Complete checkout information before payment.{" "}
            <Link href="/checkout">Checkout</Link>
          </div>
        ) : null}

        {canPay && pickup && customer ? (
          <>
            <section
              className="payment-card"
              aria-labelledby="payment-order-summary"
            >
              <h2 id="payment-order-summary" className="payment-card__title">
                Order Summary
              </h2>
              <ul className="payment-summary-list">
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
              <div className="payment-totals">
                <div className="payment-totals__row">
                  <span>Item(s) Total</span>
                  <span>{itemCount}</span>
                </div>
                <div className="payment-totals__row">
                  <span>Subtotal</span>
                  <span>฿ —</span>
                </div>
                <div className="payment-totals__row">
                  <span>Tax</span>
                  <span>฿ —</span>
                </div>
                <div className="payment-totals__row total">
                  <span>Total</span>
                  <span>฿ —</span>
                </div>
              </div>
            </section>

            <section
              className="payment-card"
              aria-labelledby="payment-pickup-summary"
            >
              <h2 id="payment-pickup-summary" className="payment-card__title">
                Pickup Summary
              </h2>
              <p className="payment-summary-meta">
                {pickup.boutique.name}
                <br />
                {pickup.boutique.address}
              </p>
              <p className="payment-summary-meta">
                Pickup Time
                <br />
                {formatPickupDateKeyLong(pickup.dateKey)}
                <br />
                {pickup.timeSlot.start} To {pickup.timeSlot.end}
              </p>
            </section>

            <section
              className="payment-card"
              aria-labelledby="payment-customer-summary"
            >
              <h2
                id="payment-customer-summary"
                className="payment-card__title"
              >
                Customer Information Summary
              </h2>
              <p className="payment-summary-meta">
                Customer Name: {customer.customerName}
                <br />
                Mobile Number: {customer.mobileNumber}
                <br />
                Email: {customer.email}
              </p>
              {customer.recipientName || customer.recipientPhone ? (
                <p className="payment-summary-meta">
                  {customer.recipientName
                    ? `Recipient Name: ${customer.recipientName}`
                    : null}
                  {customer.recipientName && customer.recipientPhone ? (
                    <br />
                  ) : null}
                  {customer.recipientPhone
                    ? `Recipient Phone: ${customer.recipientPhone}`
                    : null}
                </p>
              ) : null}
              {customer.specialRequest ? (
                <p className="payment-summary-meta">
                  Special Request / Remarks: {customer.specialRequest}
                </p>
              ) : null}
            </section>

            <section
              className="payment-card"
              aria-labelledby="payment-method-title"
            >
              <h2 id="payment-method-title" className="payment-card__title">
                Payment Method
              </h2>
              <p className="payment-note">
                Thailand payment methods — placeholder UI only. No real payment
                gateway, charge, or QR is processed. [CONTENT PENDING APPROVAL]
              </p>

              <form onSubmit={handlePlaceOrder} noValidate>
                <div
                  className="payment-methods"
                  role="radiogroup"
                  aria-labelledby="payment-method-title"
                >
                  {(
                    [
                      "credit-card",
                      "promptpay-qr",
                      "apple-pay",
                      "google-pay",
                    ] as MockPaymentMethod[]
                  ).map((id) => {
                    const selected = method === id;
                    return (
                      <label
                        key={id}
                        className={`payment-method radio${selected ? " active is-selected" : ""}`}
                      >
                        <input
                          className="payment-method__radio"
                          type="radio"
                          name="paymentMethod"
                          value={id}
                          checked={selected}
                          onChange={() => selectMethod(id)}
                        />
                        <span className="payment-method__body">
                          <span className="payment-method__title">
                            {MOCK_PAYMENT_METHOD_LABELS[id]}
                          </span>
                          <span className="payment-method__sub">
                            Placeholder only
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {errors.method ? (
                  <p className="field-validation-error" role="alert">
                    {errors.method}
                  </p>
                ) : null}

                {method === "credit-card" ? (
                  <div className="payment-panel">
                    <p className="payment-note">
                      Credit Card fields are placeholder UI only — do not enter
                      real card data.
                    </p>
                    <div className="payment-field">
                      <label htmlFor="cardholderName">Cardholder Name</label>
                      <input
                        id="cardholderName"
                        name="cardholderName"
                        type="text"
                        autoComplete="off"
                        value={card.cardholderName}
                        aria-invalid={Boolean(errors.cardholderName)}
                        className={
                          errors.cardholderName
                            ? "input-validation-error"
                            : undefined
                        }
                        onChange={(e) =>
                          setCardField("cardholderName", e.target.value)
                        }
                      />
                      {errors.cardholderName ? (
                        <p className="field-validation-error" role="alert">
                          {errors.cardholderName}
                        </p>
                      ) : null}
                    </div>
                    <div className="payment-field">
                      <label htmlFor="cardNumber">Card Number</label>
                      <input
                        id="cardNumber"
                        name="cardNumber"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="•••• •••• •••• ••••"
                        value={card.cardNumber}
                        aria-invalid={Boolean(errors.cardNumber)}
                        className={
                          errors.cardNumber
                            ? "input-validation-error"
                            : undefined
                        }
                        onChange={(e) =>
                          setCardField("cardNumber", e.target.value)
                        }
                      />
                      {errors.cardNumber ? (
                        <p className="field-validation-error" role="alert">
                          {errors.cardNumber}
                        </p>
                      ) : null}
                    </div>
                    <div className="payment-field-row">
                      <div className="payment-field">
                        <label htmlFor="expiry">Expiry</label>
                        <input
                          id="expiry"
                          name="expiry"
                          type="text"
                          autoComplete="off"
                          placeholder="MM/YY"
                          value={card.expiry}
                          aria-invalid={Boolean(errors.expiry)}
                          className={
                            errors.expiry
                              ? "input-validation-error"
                              : undefined
                          }
                          onChange={(e) =>
                            setCardField("expiry", e.target.value)
                          }
                        />
                        {errors.expiry ? (
                          <p className="field-validation-error" role="alert">
                            {errors.expiry}
                          </p>
                        ) : null}
                      </div>
                      <div className="payment-field">
                        <label htmlFor="cvv">CVV</label>
                        <input
                          id="cvv"
                          name="cvv"
                          type="password"
                          autoComplete="off"
                          inputMode="numeric"
                          value={card.cvv}
                          aria-invalid={Boolean(errors.cvv)}
                          className={
                            errors.cvv ? "input-validation-error" : undefined
                          }
                          onChange={(e) => setCardField("cvv", e.target.value)}
                        />
                        {errors.cvv ? (
                          <p className="field-validation-error" role="alert">
                            {errors.cvv}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {method === "promptpay-qr" ? (
                  <div className="payment-panel">
                    <div className="payment-qr-placeholder">
                      <div
                        className="payment-qr-box"
                        role="img"
                        aria-label="PromptPay QR placeholder"
                      />
                      <p>
                        PromptPay QR placeholder — not a real QR code.
                        <br />
                        [CONTENT PENDING APPROVAL]
                      </p>
                    </div>
                  </div>
                ) : null}

                {method === "apple-pay" || method === "google-pay" ? (
                  <div className="payment-panel">
                    <p className="payment-wallet-placeholder">
                      {MOCK_PAYMENT_METHOD_LABELS[method]} placeholder only —
                      wallet checkout is not connected. [CONTENT PENDING
                      APPROVAL]
                    </p>
                  </div>
                ) : null}

                <button type="submit" className="payment-submit">
                  Place Order
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
