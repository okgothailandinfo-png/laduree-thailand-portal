"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderById } from "@/lib/api/orders";
import type { OrderDetail } from "@/lib/api/types";
import {
  getRememberedOrderAccessToken,
  rememberCustomerOrder,
} from "@/lib/customer-orders";
import {
  buildOrderCompletedPath,
  buildOrderReceiptPath,
} from "@/lib/orders/post-payment-session";
import { MockPaymentModeNotice } from "@/lib/payment/mock-mode-notice";
import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
import { formatFullDeliveryAddressInline } from "../checkout/delivery-address-form";
import { computeOrderTotals, formatOrderTotalThb } from "../checkout/order-totals";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";
import {
  DEFAULT_MOCK_DELIVERY_TRACKING_STATUS,
  deliveryTrackingStatusFromOrderStatus,
  getDeliveryTrackingSteps,
  type DeliveryTrackingStatus,
} from "./delivery-tracking";
import PickupCredentialsCard from "./PickupCredentialsCard";
import "./order-confirmation.css";

function isConfirmationAllowed(order: OrderDetail): boolean {
  if (order.payment?.status === "mock_accepted") return true;
  if (order.status === "pending" || order.status === "cancelled") return false;
  return true;
}

function deliveryModeLabel(
  mode: "EARLIEST_AVAILABLE" | "PREORDER",
): string {
  return mode === "EARLIEST_AVAILABLE" ? "Earliest Delivery" : "Pre-order";
}

function deliveryTimeDetails(
  mode: "EARLIEST_AVAILABLE" | "PREORDER",
  opts: {
    dateKey?: string | null;
    timeSlotLabel?: string | null;
    timeSlot?: { start: string; end: string } | null;
    promiseDateKey?: string | null;
    promiseTimeWindow?: { start: string; end: string } | null;
  },
): { dateLabel: string; windowLabel: string } | null {
  if (mode === "EARLIEST_AVAILABLE") {
    const dateKey = opts.promiseDateKey ?? opts.dateKey;
    const window = opts.promiseTimeWindow ?? opts.timeSlot;
    if (!dateKey || !window) return null;
    return {
      dateLabel: formatPickupDateKeyLong(dateKey),
      windowLabel: `${window.start} To ${window.end}`,
    };
  }
  if (opts.dateKey && (opts.timeSlot || opts.timeSlotLabel)) {
    return {
      dateLabel: formatPickupDateKeyLong(opts.dateKey),
      windowLabel: opts.timeSlot
        ? `${opts.timeSlot.start} To ${opts.timeSlot.end}`
        : (opts.timeSlotLabel ?? ""),
    };
  }
  return null;
}

function DeliveryTrackingSection({
  currentStatus = DEFAULT_MOCK_DELIVERY_TRACKING_STATUS,
}: {
  currentStatus?: DeliveryTrackingStatus;
}) {
  const steps = getDeliveryTrackingSteps(currentStatus);
  return (
    <section
      className="order-confirmation-card"
      aria-labelledby="confirmation-tracking"
      data-testid="delivery-order-tracking"
    >
      <h2
        id="confirmation-tracking"
        className="order-confirmation-card__title"
      >
        Track your order status
      </h2>
      <ol className="order-confirmation-tracking">
        {steps.map((step) => (
          <li
            key={step.label}
            className={
              step.isCurrent
                ? "is-current"
                : step.isComplete
                  ? "is-complete"
                  : undefined
            }
            aria-current={step.isCurrent ? "step" : undefined}
            data-tracking-status={step.label}
            data-tracking-current={step.isCurrent ? "true" : "false"}
          >
            <span className="order-confirmation-tracking__label">
              {step.label}
            </span>
            {step.isCurrent ? (
              <span className="order-confirmation-tracking__current">
                Current
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function DeliveryFulfillmentSummary({
  mode,
  recipient,
  addressLines,
  time,
  feeThb,
}: {
  mode: "EARLIEST_AVAILABLE" | "PREORDER";
  recipient?: string;
  addressLines: ReactNode;
  time: { dateLabel: string; windowLabel: string } | null;
  feeThb?: number | null;
}) {
  return (
    <>
      <p className="order-confirmation-meta">
        Delivery Mode
        <br />
        {deliveryModeLabel(mode)}
      </p>
      {recipient ? (
        <p className="order-confirmation-meta">
          Recipient
          <br />
          {recipient}
        </p>
      ) : null}
      <p className="order-confirmation-meta">
        Full Address
        <br />
        {addressLines}
      </p>
      {time ? (
        <p className="order-confirmation-meta">
          Delivery Date
          <br />
          {time.dateLabel}
          <br />
          Delivery Window
          <br />
          {time.windowLabel}
        </p>
      ) : null}
      {typeof feeThb === "number" ? (
        <p className="order-confirmation-meta">
          Delivery Fee
          <br />
          {formatPriceThb(feeThb)}
        </p>
      ) : null}
    </>
  );
}

export default function OrderConfirmationClient({
  orderId,
  accessToken,
  isMockPaymentMode = false,
}: {
  orderId: string | null;
  accessToken: string | null;
  isMockPaymentMode?: boolean;
}) {
  const resolvedAccessToken =
    accessToken?.trim() ||
    (orderId ? getRememberedOrderAccessToken(orderId) : null);

  const orderQuery = useAsyncResource(
    (signal) => {
      if (!orderId) return Promise.resolve(null);
      if (!resolvedAccessToken) {
        return Promise.reject(
          new Error(
            "Order access token is required. Open this page from your payment confirmation or Order History link.",
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

  useEffect(() => {
    if (
      orderQuery.status === "success" &&
      orderQuery.data &&
      resolvedAccessToken &&
      isConfirmationAllowed(orderQuery.data)
    ) {
      rememberCustomerOrder({
        orderId: orderQuery.data.id,
        accessToken: resolvedAccessToken,
        orderNumber: orderQuery.data.orderNumber,
      });
    }
  }, [orderQuery.status, orderQuery.data, resolvedAccessToken]);

  if (orderId) {
    const order = orderQuery.data;
    const itemCountFromOrder =
      order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    const showLoadState =
      orderQuery.status === "loading" ||
      orderQuery.status === "error" ||
      orderQuery.status === "empty";
    const isDelivery = order?.serviceType === "DELIVERY";
    const orderTotals = computeOrderTotals({
      serviceType: isDelivery ? "DELIVERY" : "PICKUP",
      subtotalThb: null,
      deliveryFeeThb: order?.delivery?.feeThb ?? null,
      trustedTotalThb:
        order && typeof order.totalThb === "number" ? order.totalThb : null,
    });
    const deliveryTrackingStatus = order
      ? deliveryTrackingStatusFromOrderStatus(order.status)
      : DEFAULT_MOCK_DELIVERY_TRACKING_STATUS;

    return (
      <main className="order-confirmation-page" id="main-content" tabIndex={-1}>
        <div className="order-confirmation-page__inner">
          <div className="order-confirmation-page__top">
            <Link href="/" className="order-confirmation-page__back">
              ← Back
            </Link>
          </div>

          <h1 className="order-confirmation-page__title">Order Confirmation</h1>

          {!resolvedAccessToken ? (
            <div
              className="order-confirmation-gate"
              role="alert"
              data-testid="confirmation-token-required"
            >
              Order access token is required. Open this page from your payment
              confirmation or Order History link.{" "}
              <Link href="/order-history">Order History</Link>
            </div>
          ) : null}

          {resolvedAccessToken && showLoadState ? (
            <CatalogStatus
              status={
                orderQuery.status === "loading"
                  ? "loading"
                  : "error"
              }
              errorMessage={
                orderQuery.errorMessage
                  ? /access token has expired/i.test(orderQuery.errorMessage)
                    ? "Order access has expired. Open the order again from Order History, or return to checkout if payment is still pending."
                    : /access token/i.test(orderQuery.errorMessage)
                      ? "Order access token is invalid. Open this page from Order History or your payment confirmation link."
                      : orderQuery.errorMessage
                  : orderQuery.status === "empty"
                    ? "Order not found."
                    : null
              }
              onRetry={
                orderQuery.status === "error" || orderQuery.status === "empty"
                  ? /access token/i.test(orderQuery.errorMessage ?? "")
                    ? undefined
                    : orderQuery.reload
                  : undefined
              }
            />
          ) : null}

          {resolvedAccessToken &&
          orderQuery.status === "success" &&
          order ? (
            !isConfirmationAllowed(order) ? (
              <div
                className="order-confirmation-gate"
                role="alert"
                data-testid="confirmation-payment-required"
              >
                {order.payment?.status === "failed"
                  ? "Payment failed. Complete payment before viewing confirmation."
                  : "Payment required. Order confirmation is available after payment succeeds."}{" "}
                <Link
                  href={
                    resolvedAccessToken
                      ? `/payment?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(resolvedAccessToken)}`
                      : `/payment?orderId=${encodeURIComponent(order.id)}`
                  }
                >
                  Payment
                </Link>
              </div>
            ) : (
            <>
              <section className="order-confirmation-banner" aria-live="polite">
                <p className="order-confirmation-banner__message">
                  Payment successful!
                </p>
                <p className="order-confirmation-banner__sub">
                  Your order is good to go!
                </p>
                {isMockPaymentMode ? (
                  <MockPaymentModeNotice className="order-confirmation-banner__mock-note" />
                ) : null}
              </section>

              <section
                className="order-confirmation-card"
                aria-labelledby="confirmation-order-number"
              >
                <h2
                  id="confirmation-order-number"
                  className="order-confirmation-card__title"
                >
                  Order Number
                </h2>
                <p
                  className="order-confirmation-order-number"
                  data-testid="confirmation-order-number"
                >
                  {order.orderNumber}
                </p>
              </section>

              <section
                className="order-confirmation-card"
                aria-labelledby="confirmation-payment"
                data-testid="confirmation-payment"
              >
                <h2
                  id="confirmation-payment"
                  className="order-confirmation-card__title"
                >
                  Payment summary
                </h2>
                <p className="order-confirmation-meta">
                  Payment Status:{" "}
                  {order.payment?.status === "mock_accepted"
                    ? isMockPaymentMode
                      ? "Succeeded (mock)"
                      : "Succeeded"
                    : order.payment?.status ?? "Succeeded"}
                  <br />
                  Payment Method:{" "}
                  {order.payment?.methodLabel ?? "—"}
                  {order.payment?.safeDisplay ? (
                    <>
                      <br />
                      {order.payment.safeDisplay}
                    </>
                  ) : null}
                </p>
              </section>

              <section
                className="order-confirmation-card"
                aria-labelledby="confirmation-pickup"
              >
                <h2
                  id="confirmation-pickup"
                  className="order-confirmation-card__title"
                >
                  {isDelivery ? "Delivery" : "Pickup boutique"}
                </h2>
                {isDelivery && order.delivery ? (
                  <DeliveryFulfillmentSummary
                    mode={order.delivery.mode}
                    recipient={order.delivery.address.recipient}
                    feeThb={order.delivery.feeThb}
                    time={deliveryTimeDetails(order.delivery.mode, {
                      dateKey: order.delivery.dateKey,
                      timeSlotLabel: order.delivery.timeSlotLabel,
                    })}
                    addressLines={formatFullDeliveryAddressInline(
                      order.delivery.address,
                    )}
                  />
                ) : order.pickup ? (
                  <>
                    <p className="order-confirmation-meta">
                      {order.pickup.boutiqueName}
                      <br />
                      {order.pickup.address}
                    </p>
                    <p className="order-confirmation-meta">
                      Pickup Date
                      <br />
                      {formatPickupDateKeyLong(order.pickup.dateKey)}
                      <br />
                      Pickup Time
                      <br />
                      {order.pickup.timeSlotLabel}
                    </p>
                  </>
                ) : null}
              </section>

              {isDelivery ? (
                <DeliveryTrackingSection
                  currentStatus={deliveryTrackingStatus}
                />
              ) : null}
              {!isDelivery && resolvedAccessToken ? (
                <PickupCredentialsCard
                  orderId={order.id}
                  accessToken={resolvedAccessToken}
                />
              ) : null}

              <section
                className="order-confirmation-card"
                aria-labelledby="confirmation-customer"
              >
                <h2
                  id="confirmation-customer"
                  className="order-confirmation-card__title"
                >
                  Customer Information
                </h2>
                <p className="order-confirmation-meta">
                  Customer Name: {order.customer.customerName}
                  <br />
                  Mobile Number: {order.customer.mobileNumber}
                  <br />
                  Email: {order.customer.email}
                </p>
              </section>

              <section
                className="order-confirmation-card"
                aria-labelledby="confirmation-items"
              >
                <h2
                  id="confirmation-items"
                  className="order-confirmation-card__title"
                >
                  Ordered items summary
                </h2>
                <ul className="order-confirmation-list">
                  {order.items.map((item, index) => (
                    <li key={`${item.productId}-${index}`}>
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
                <div
                  className="order-confirmation-totals"
                  data-testid="confirmation-totals"
                >
                  <div className="order-confirmation-totals__row">
                    <span>Item(s) Total</span>
                    <span>{itemCountFromOrder}</span>
                  </div>
                  <div className="order-confirmation-totals__row">
                    <span>Subtotal</span>
                    <span data-testid="confirmation-subtotal">
                      {formatOrderTotalThb(orderTotals.subtotalThb)}
                    </span>
                  </div>
                  {isDelivery &&
                  typeof orderTotals.deliveryFeeThb === "number" ? (
                    <div className="order-confirmation-totals__row">
                      <span>Delivery Fee</span>
                      <span data-testid="confirmation-delivery-fee">
                        {formatOrderTotalThb(orderTotals.deliveryFeeThb)}
                      </span>
                    </div>
                  ) : null}
                  <div className="order-confirmation-totals__row">
                    <span>Tax</span>
                    <span>฿ —</span>
                  </div>
                  <div className="order-confirmation-totals__row total">
                    <span>Total</span>
                    <span data-testid="confirmation-total">
                      {formatOrderTotalThb(orderTotals.totalThb)}
                    </span>
                  </div>
                </div>
              </section>

              <div className="order-confirmation-actions">
                {resolvedAccessToken ? (
                  <Link
                    href={buildOrderReceiptPath({
                      orderId: order.id,
                      accessToken: resolvedAccessToken,
                    })}
                    className="order-confirmation-continue"
                    data-testid="view-payment-receipt"
                  >
                    View Payment Receipt
                  </Link>
                ) : null}
                {order.status === "completed" && resolvedAccessToken ? (
                  <Link
                    href={buildOrderCompletedPath({
                      orderId: order.id,
                      accessToken: resolvedAccessToken,
                    })}
                    className="order-confirmation-continue"
                  >
                    View Order Details
                  </Link>
                ) : null}
                <Link href="/order-history" className="order-confirmation-continue">
                  Order History
                </Link>
                <Link href="/" className="order-confirmation-continue">
                  Continue Shopping
                </Link>
              </div>
            </>
            )
          ) : null}
        </div>
      </main>
    );
  }

  // Sprint 28 — confirmation requires a tokenized server order.
  return (
    <main className="order-confirmation-page" id="main-content" tabIndex={-1}>
      <div className="order-confirmation-page__inner">
        <div className="order-confirmation-page__top">
          <Link href="/" className="order-confirmation-page__back">
            ← Back
          </Link>
        </div>

        <h1 className="order-confirmation-page__title">Order Confirmation</h1>

        <div
          className="order-confirmation-gate"
          role="alert"
          data-testid="confirmation-token-required"
        >
          Order access token is required. Open this page from your payment
          confirmation or Order History link.{" "}
          <Link href="/order-history">Order History</Link>
        </div>
      </div>
    </main>
  );
}
