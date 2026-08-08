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
import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
import { useCart } from "../cart/CartContext";
import { formatFullDeliveryAddressInline } from "../checkout/delivery-address-form";
import { computeOrderTotals, formatOrderTotalThb } from "../checkout/order-totals";
import { useCheckout } from "../checkout/CheckoutContext";
import { useOrderFlow } from "../order/OrderFlowContext";
import { usePickup } from "../pickup/PickupContext";
import { isDeliveryQuoteValidForCheckout } from "../pickup/delivery-quote";
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
}: {
  orderId: string | null;
  accessToken: string | null;
}) {
  const { items, itemCount, subtotalThb } = useCart();
  const { confirmed: checkout, isCheckoutInfoComplete } = useCheckout();
  const { confirmed: pickup, isPickupComplete } = usePickup();
  const { placedOrder, isOrderPlaced } = useOrderFlow();

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
      <main className="order-confirmation-page">
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
                orderQuery.errorMessage ??
                (orderQuery.status === "empty" ? "Order not found." : null)
              }
              onRetry={
                orderQuery.status === "error" || orderQuery.status === "empty"
                  ? orderQuery.reload
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
                  href={`/payment?orderId=${encodeURIComponent(order.id)}`}
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
                    ? "Succeeded"
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

  const isEmpty = items.length === 0;
  const canShow =
    !isEmpty &&
    isPickupComplete &&
    isCheckoutInfoComplete &&
    isOrderPlaced &&
    !!pickup &&
    !!checkout &&
    !!placedOrder;
  const isClientDelivery = pickup?.serviceType === "DELIVERY";
  const clientDeliveryFee =
    isClientDelivery &&
    isDeliveryQuoteValidForCheckout(pickup.deliveryQuote) &&
    typeof pickup.deliveryQuote.deliveryFee === "number"
      ? pickup.deliveryQuote.deliveryFee
      : null;
  const clientTotals = computeOrderTotals({
    serviceType: isClientDelivery ? "DELIVERY" : "PICKUP",
    subtotalThb,
    deliveryFeeThb: clientDeliveryFee,
  });

  return (
    <main className="order-confirmation-page">
      <div className="order-confirmation-page__inner">
        <div className="order-confirmation-page__top">
          <Link
            href={isOrderPlaced ? "/" : "/payment"}
            className="order-confirmation-page__back"
          >
            ← Back
          </Link>
        </div>

        <h1 className="order-confirmation-page__title">Order Confirmation</h1>

        {isEmpty ? (
          <div className="order-confirmation-gate" role="alert">
            Your cart is empty.Add at least 1 item to checkout!{" "}
            <Link href="/">Home</Link>
          </div>
        ) : null}

        {!isEmpty && !isPickupComplete ? (
          <div className="order-confirmation-gate" role="alert">
            Select service, date and time before viewing confirmation.{" "}
            <Link href="/">Home</Link>
          </div>
        ) : null}

        {!isEmpty && isPickupComplete && !isCheckoutInfoComplete ? (
          <div className="order-confirmation-gate" role="alert">
            Complete checkout information before viewing confirmation.{" "}
            <Link href="/checkout">Checkout</Link>
          </div>
        ) : null}

        {!isEmpty &&
        isPickupComplete &&
        isCheckoutInfoComplete &&
        !isOrderPlaced ? (
          <div className="order-confirmation-gate" role="alert">
            Place a mock order before viewing confirmation.{" "}
            <Link href="/payment">Payment</Link>
          </div>
        ) : null}

        {canShow && pickup && checkout && placedOrder ? (
          <>
            <section className="order-confirmation-banner" aria-live="polite">
              <p className="order-confirmation-banner__message">
                Payment successful!
              </p>
              <p className="order-confirmation-banner__sub">
                Your order is good to go!
              </p>
            </section>

            <p className="order-confirmation-note">
              Mock success only — no payment gateway, backend, or API was used.
              Order number is placeholder data.
            </p>

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
                {placedOrder.orderNumber}
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
                {isClientDelivery ? "Delivery" : "Pickup boutique"}
              </h2>
              {isClientDelivery ? (
                <DeliveryFulfillmentSummary
                  mode={pickup.deliveryMode}
                  recipient={
                    checkout.deliveryAddress.recipient.trim() ||
                    pickup.deliveryAddress.recipient ||
                    checkout.customerName
                  }
                  feeThb={clientDeliveryFee}
                  time={
                    isDeliveryQuoteValidForCheckout(pickup.deliveryQuote) &&
                    pickup.deliveryQuote.deliveryDate &&
                    pickup.deliveryQuote.deliveryWindow
                      ? {
                          dateLabel: formatPickupDateKeyLong(
                            pickup.deliveryQuote.deliveryDate,
                          ),
                          windowLabel: `${pickup.deliveryQuote.deliveryWindow.start} To ${pickup.deliveryQuote.deliveryWindow.end}`,
                        }
                      : null
                  }
                  addressLines={formatFullDeliveryAddressInline(
                    checkout.deliveryAddress.address.trim()
                      ? checkout.deliveryAddress
                      : pickup.deliveryAddress,
                  )}
                />
              ) : (
                <>
                  <p className="order-confirmation-meta">
                    {pickup.boutique.name}
                    <br />
                    {pickup.boutique.address}
                  </p>
                  <p className="order-confirmation-meta">
                    Pickup date &amp; time
                    <br />
                    {formatPickupDateKeyLong(pickup.dateKey)}
                    <br />
                    {pickup.timeSlot.start} To {pickup.timeSlot.end}
                  </p>
                </>
              )}
            </section>

            {isClientDelivery ? <DeliveryTrackingSection /> : null}

            <section
              className="order-confirmation-card"
              aria-labelledby="confirmation-customer"
            >
              <h2
                id="confirmation-customer"
                className="order-confirmation-card__title"
              >
                Customer information summary
              </h2>
              <p className="order-confirmation-meta">
                Customer Name: {checkout.customerName}
                <br />
                Mobile Number: {checkout.mobileNumber}
                <br />
                Email: {checkout.email}
              </p>
              {checkout.recipientName || checkout.recipientPhone ? (
                <p className="order-confirmation-meta">
                  {checkout.recipientName
                    ? `Recipient Name: ${checkout.recipientName}`
                    : null}
                  {checkout.recipientName && checkout.recipientPhone ? (
                    <br />
                  ) : null}
                  {checkout.recipientPhone
                    ? `Recipient Phone: ${checkout.recipientPhone}`
                    : null}
                </p>
              ) : null}
              {(checkout.deliveryAddress.notes ?? checkout.specialRequest)
                .trim() ? (
                <p className="order-confirmation-meta">
                  Delivery Notes:{" "}
                  {(
                    checkout.deliveryAddress.notes ?? checkout.specialRequest
                  ).trim()}
                </p>
              ) : null}
            </section>

            <section
              className="order-confirmation-card"
              aria-labelledby="confirmation-payment"
            >
              <h2
                id="confirmation-payment"
                className="order-confirmation-card__title"
              >
                Payment summary
              </h2>
              <p className="order-confirmation-meta">
                Payment Method: {placedOrder.paymentMethodLabel}
                <br />
                Gateway: [CONTENT PENDING APPROVAL]
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
              <div
                className="order-confirmation-totals"
                data-testid="confirmation-totals"
              >
                <div className="order-confirmation-totals__row">
                  <span>Item(s) Total</span>
                  <span>{itemCount}</span>
                </div>
                <div className="order-confirmation-totals__row">
                  <span>Subtotal</span>
                  <span data-testid="confirmation-subtotal">
                    {formatOrderTotalThb(clientTotals.subtotalThb)}
                  </span>
                </div>
                {isClientDelivery &&
                typeof clientTotals.deliveryFeeThb === "number" ? (
                  <div className="order-confirmation-totals__row">
                    <span>Delivery Fee</span>
                    <span data-testid="confirmation-delivery-fee">
                      {formatOrderTotalThb(clientTotals.deliveryFeeThb)}
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
                    {formatOrderTotalThb(clientTotals.totalThb)}
                  </span>
                </div>
              </div>
            </section>

            <div className="order-confirmation-actions">
              <Link href="/" className="order-confirmation-continue">
                Continue Shopping
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
