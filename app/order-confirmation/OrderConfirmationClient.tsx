"use client";

import Link from "next/link";
import { useCart } from "../cart/CartContext";
import { useCheckout } from "../checkout/CheckoutContext";
import { useOrderFlow } from "../order/OrderFlowContext";
import { usePickup } from "../pickup/PickupContext";
import {
  formatPickupDateLong,
  parseDateKey,
} from "../pickup/mock-pickup";
import "./order-confirmation.css";

export default function OrderConfirmationClient() {
  const { items, itemCount } = useCart();
  const { confirmed: checkout, isCheckoutInfoComplete } = useCheckout();
  const { confirmed: pickup, isPickupComplete } = usePickup();
  const { placedOrder, isOrderPlaced } = useOrderFlow();

  const isEmpty = items.length === 0;
  const canShow =
    !isEmpty &&
    isPickupComplete &&
    isCheckoutInfoComplete &&
    isOrderPlaced &&
    !!pickup &&
    !!checkout &&
    !!placedOrder;

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
                Order number
              </h2>
              <p className="order-confirmation-order-number">
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
                Pickup boutique
              </h2>
              <p className="order-confirmation-meta">
                {pickup.boutique.name}
                <br />
                {pickup.boutique.address}
              </p>
              <p className="order-confirmation-meta">
                Pickup date &amp; time
                <br />
                {formatPickupDateLong(parseDateKey(pickup.dateKey))}
                <br />
                {pickup.timeSlot.start} To {pickup.timeSlot.end}
              </p>
            </section>

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
              {checkout.specialRequest ? (
                <p className="order-confirmation-meta">
                  Special Request / Remarks: {checkout.specialRequest}
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
              <div className="order-confirmation-totals">
                <div className="order-confirmation-totals__row">
                  <span>Item(s) Total</span>
                  <span>{itemCount}</span>
                </div>
                <div className="order-confirmation-totals__row">
                  <span>Subtotal</span>
                  <span>฿ —</span>
                </div>
                <div className="order-confirmation-totals__row">
                  <span>Tax</span>
                  <span>฿ —</span>
                </div>
                <div className="order-confirmation-totals__row total">
                  <span>Total amount</span>
                  <span>฿ —</span>
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
