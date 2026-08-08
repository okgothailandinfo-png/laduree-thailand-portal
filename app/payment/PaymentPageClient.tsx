"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ApiClientError } from "@/lib/api/client";
import { fetchOrderById } from "@/lib/api/orders";
import { createPayment } from "@/lib/api/payment";
import {
  getRememberedOrderAccessToken,
  rememberCustomerOrder,
} from "@/lib/customer-orders";
import {
  focusFirstInvalidCardField,
  formatCardNumberInput,
  formatExpiryInput,
  safeCardDisplayFromNumber,
  validateMockCard,
  type CardDraft,
  type CardFieldErrors,
} from "@/lib/payment/card-validation";
import {
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/payment/methods";
import {
  paymentUiStateFromMethod,
  preventsDuplicateSubmission,
  type PaymentUiState,
} from "@/lib/payment/payment-ui-state";
import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
import { CHECKOUT_BLOCKING_MESSAGES } from "../cart/checkout-eligibility";
import { useCart } from "../cart/CartContext";
import { useCheckout } from "../checkout/CheckoutContext";
import OrderReview from "../checkout/OrderReview";
import {
  buildOrderReviewTotals,
  formatModifiersLabel,
  TRUSTED_TAX_PLACEHOLDER,
  type OrderReviewModel,
} from "../checkout/order-review-model";
import { formatFullDeliveryAddressInline } from "../checkout/delivery-address-form";
import { useOrderFlow } from "../order/OrderFlowContext";
import { usePickup } from "../pickup/PickupContext";
import { isDeliveryQuoteValidForCheckout } from "../pickup/delivery-quote";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";
import "./payment.css";

type PaymentErrors = CardFieldErrors &
  Partial<Record<"method" | "form", string>>;

const emptyCard: CardDraft = {
  cardholderName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
};

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

export default function PaymentPageClient({
  orderId,
  accessToken,
}: {
  orderId: string | null;
  accessToken: string | null;
}) {
  const router = useRouter();
  const { items, itemCount, subtotalThb } = useCart();
  const { confirmed: checkout, isCheckoutInfoComplete } = useCheckout();
  const { confirmed: pickup, isPickupComplete, openPickupSelection } =
    usePickup();
  const { selectedPaymentMethod, setSelectedPaymentMethod } = useOrderFlow();

  const [method, setMethod] = useState<PaymentMethodId | null>(
    selectedPaymentMethod,
  );
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [uiState, setUiState] = useState<PaymentUiState>(() =>
    paymentUiStateFromMethod(selectedPaymentMethod !== null),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const resolvedAccessToken =
    accessToken?.trim() ||
    (orderId ? getRememberedOrderAccessToken(orderId) : null);

  const orderQuery = useAsyncResource(
    (signal) => {
      if (!orderId) return Promise.resolve(null);
      if (!resolvedAccessToken) {
        return Promise.reject(
          new Error(
            "Order access token is required. Return to checkout to continue payment.",
          ),
        );
      }
      return fetchOrderById(orderId, {
        signal,
        accessToken: resolvedAccessToken,
      });
    },
    {
      deps: [orderId, resolvedAccessToken],
      isEmpty: (data) => data === null,
    },
  );

  const isEmpty = items.length === 0;
  const termsAccepted = checkout?.termsAccepted === true;
  const canPay =
    !isEmpty &&
    isPickupComplete &&
    isCheckoutInfoComplete &&
    termsAccepted &&
    !!checkout &&
    !!orderId;

  const order = orderId ? orderQuery.data : null;
  const isDelivery = pickup?.serviceType === "DELIVERY";
  const deliveryFeeThb =
    isDelivery &&
    pickup &&
    isDeliveryQuoteValidForCheckout(pickup.deliveryQuote) &&
    typeof pickup.deliveryQuote.deliveryFee === "number"
      ? pickup.deliveryQuote.deliveryFee
      : order?.delivery?.feeThb ?? null;

  const orderTotals = buildOrderReviewTotals({
    serviceType: isDelivery ? "DELIVERY" : "PICKUP",
    subtotalThb:
      typeof order?.totalThb === "number"
        ? null
        : subtotalThb,
    deliveryFeeThb,
    trustedTotalThb:
      order && typeof order.totalThb === "number" && Number.isFinite(order.totalThb)
        ? order.totalThb
        : null,
  });

  const reviewModel: OrderReviewModel | null = useMemo(() => {
    if (!pickup || !checkout) return null;
    const customerName =
      `${checkout.firstName} ${checkout.lastName}`.trim() ||
      checkout.customerName;
    const deliveryNotes =
      (checkout.deliveryAddress.notes ?? "").trim() ||
      checkout.specialRequest.trim() ||
      null;

    return {
      serviceType: isDelivery ? "DELIVERY" : "PICKUP",
      customer: {
        customerName,
        email: checkout.email,
        mobileNumber: checkout.mobileNumber,
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        modifiersLabel: formatModifiersLabel(item.modifiers),
      })),
      totals: orderTotals,
      taxLabel: TRUSTED_TAX_PLACEHOLDER,
      pickup:
        !isDelivery && pickup.serviceType === "PICKUP"
          ? {
              boutiqueName: pickup.boutique.name,
              boutiqueAddress: pickup.boutique.address,
              dateLabel: formatPickupDateKeyLong(pickup.dateKey),
              timeLabel: `${pickup.timeSlot.start} To ${pickup.timeSlot.end}`,
            }
          : null,
      delivery: isDelivery
        ? {
            fullAddress: formatFullDeliveryAddressInline(
              checkout.deliveryAddress.address.trim()
                ? checkout.deliveryAddress
                : pickup.deliveryAddress,
            ),
            modeLabel: deliveryModeLabel(pickup.deliveryMode),
            dateLabel:
              isDeliveryQuoteValidForCheckout(pickup.deliveryQuote) &&
              pickup.deliveryQuote.deliveryDate
                ? formatPickupDateKeyLong(pickup.deliveryQuote.deliveryDate)
                : null,
            windowLabel:
              isDeliveryQuoteValidForCheckout(pickup.deliveryQuote) &&
              pickup.deliveryQuote.deliveryWindow
                ? `${pickup.deliveryQuote.deliveryWindow.start} To ${pickup.deliveryQuote.deliveryWindow.end}`
                : null,
            notes: deliveryNotes,
            deliveryFeeThb,
          }
        : null,
    };
  }, [
    pickup,
    checkout,
    isDelivery,
    items,
    orderTotals,
    deliveryFeeThb,
  ]);

  const placeOrderEnabled =
    canPay &&
    method !== null &&
    !preventsDuplicateSubmission(uiState) &&
    uiState !== "SUCCEEDED";

  function setCardField<K extends keyof CardDraft>(key: K, value: string) {
    let nextValue = value;
    if (key === "cardNumber") nextValue = formatCardNumberInput(value);
    if (key === "expiry") nextValue = formatExpiryInput(value);
    if (key === "cvv") nextValue = value.replace(/\D/g, "").slice(0, 4);

    setCard((current) => ({ ...current, [key]: nextValue }));
    setErrors((current) => {
      if (!current[key] && !current.form) return current;
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function selectMethod(next: PaymentMethodId) {
    setMethod(next);
    setSelectedPaymentMethod(next);
    setUiState("READY");
    setErrors((current) => {
      if (!current.method && !current.form) return current;
      const cleared = { ...current };
      delete cleared.method;
      delete cleared.form;
      return cleared;
    });
    // Clear card secrets when leaving card method — never persist.
    if (next !== "credit-card") {
      setCard(emptyCard);
    }
  }

  function validatePayment(): boolean {
    const next: PaymentErrors = {};
    if (!method) {
      next.method = "Please select a payment method.";
    }

    if (method === "credit-card") {
      Object.assign(next, validateMockCard(card));
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (method === "credit-card") {
        focusFirstInvalidCardField(next);
      }
      return false;
    }
    return true;
  }

  async function runCreatePayment() {
    if (!canPay || !method || !orderId) return;
    if (!validatePayment()) return;
    if (preventsDuplicateSubmission(uiState)) return;

    setUiState("PROCESSING");
    setSubmitError(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `pay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    const safeDisplay =
      method === "credit-card"
        ? safeCardDisplayFromNumber(card.cardNumber)
        : null;

    try {
      const result = await createPayment(
        {
          orderId,
          method,
          ...(safeDisplay ? { safeDisplay } : {}),
        },
        { idempotencyKey: idempotencyKeyRef.current },
      );
      // Never carry PAN/CVV forward.
      setCard(emptyCard);
      idempotencyKeyRef.current = null;
      if (result.accessToken) {
        rememberCustomerOrder({
          orderId,
          accessToken: result.accessToken,
          orderNumber: result.orderNumber,
        });
      }
      router.push(result.paymentUrl);
    } catch (error: unknown) {
      setUiState("FAILED");
      const message = errorMessage(
        error,
        "Unable to start payment. Please try again.",
      );
      if (
        error instanceof ApiClientError &&
        /already paid/i.test(error.message)
      ) {
        setSubmitError("Order already paid.");
      } else {
        setSubmitError(message);
      }
    }
  }

  function handlePlaceOrder(event: FormEvent) {
    event.preventDefault();
    if (!placeOrderEnabled) {
      if (!method) {
        setErrors({ method: "Please select a payment method." });
      } else if (!termsAccepted) {
        setErrors({ form: "Accept Terms & Conditions before payment." });
      }
      return;
    }
    void runCreatePayment();
  }

  const isSubmitting = uiState === "PROCESSING";

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
            {CHECKOUT_BLOCKING_MESSAGES.emptyCart}{" "}
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

        {!isEmpty &&
        isPickupComplete &&
        isCheckoutInfoComplete &&
        !orderId ? (
          <div className="payment-gate" role="alert">
            Complete checkout information before payment.{" "}
            <Link href="/checkout">Checkout</Link>
          </div>
        ) : null}

        {canPay && pickup && checkout && reviewModel ? (
          <>
            <section className="payment-card" aria-labelledby="payment-review">
              <OrderReview
                model={reviewModel}
                testId="payment-order-review"
                className="payment-order-review"
              />
              {orderId &&
              (orderQuery.status === "loading" ||
                orderQuery.status === "error") ? (
                <div className="payment-order-status">
                  <CatalogStatus
                    status={
                      orderQuery.status === "loading" ? "loading" : "error"
                    }
                    errorMessage={
                      orderQuery.errorMessage ??
                      "Unable to load order totals. Please try again."
                    }
                    onRetry={
                      orderQuery.status === "error"
                        ? orderQuery.reload
                        : undefined
                    }
                  />
                </div>
              ) : null}
              <p className="payment-summary-meta" data-testid="payment-item-count">
                Item(s) Total: {itemCount}
              </p>
            </section>

            <section
              className="payment-card"
              aria-labelledby="payment-method-title"
            >
              <h2 id="payment-method-title" className="payment-card__title">
                Payment Method
              </h2>
              <p className="payment-note">
                Mock payment only — no real charge or QR is processed.
              </p>

              <form onSubmit={handlePlaceOrder} noValidate>
                <div
                  className="payment-methods"
                  role="radiogroup"
                  aria-labelledby="payment-method-title"
                  data-testid="payment-method-list"
                >
                  {PAYMENT_METHOD_IDS.map((id) => {
                    const selected = method === id;
                    return (
                      <label
                        key={id}
                        className={`payment-method radio${selected ? " active is-selected" : ""}`}
                        data-testid={`payment-method-${id}`}
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
                            {PAYMENT_METHOD_LABELS[id]}
                          </span>
                          <span className="payment-method__sub">
                            Mock only
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
                  <div
                    className="payment-panel"
                    data-testid="credit-card-payment-screen"
                  >
                    <p className="payment-note">
                      Credit Card fields are mock UI only — do not enter real
                      card data.
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
                        <label htmlFor="expiry">Expiry Date</label>
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
                  <div
                    className="payment-panel"
                    data-testid="promptpay-payment-screen"
                  >
                    <p className="payment-note">
                      PromptPay QR will open on the next mock authorization
                      screen. No real QR is generated.
                    </p>
                  </div>
                ) : null}

                {errors.form ? (
                  <p className="field-validation-error" role="alert">
                    {errors.form}
                  </p>
                ) : null}

                {uiState === "PROCESSING" || uiState === "FAILED" ? (
                  <div className="payment-submit-status">
                    <CatalogStatus
                      status={uiState === "PROCESSING" ? "loading" : "error"}
                      errorMessage={submitError}
                      onRetry={
                        uiState === "FAILED"
                          ? () => {
                              setUiState(method ? "READY" : "UNSELECTED");
                              void runCreatePayment();
                            }
                          : undefined
                      }
                    />
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="payment-submit"
                  disabled={!placeOrderEnabled}
                  aria-busy={isSubmitting}
                  data-testid="place-order"
                >
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
