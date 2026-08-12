"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderCompletion } from "@/lib/api/orders";
import {
  getRememberedOrderAccessToken,
  rememberCustomerOrder,
} from "@/lib/customer-orders";
import { buildOrderReceiptPath } from "@/lib/orders/post-payment-session";
import { MockPaymentModeNotice } from "@/lib/payment/mock-mode-notice";
import CatalogStatus from "../../catalog/CatalogStatus";
import { useAsyncResource } from "../../catalog/useAsyncResource";
import { formatPickupDateKeyLong } from "../../pickup/pickup-dates";
import {
  formatDateTimeBangkok,
  formatModifierLine,
  formatStatusLabel,
} from "../format";
import "../order-completed.css";

export default function OrderCompletedClient({
  orderId,
  accessToken,
  isMockPaymentMode = false,
}: {
  orderId: string;
  accessToken: string | null;
  isMockPaymentMode?: boolean;
}) {
  const resolvedAccessToken =
    accessToken?.trim() || getRememberedOrderAccessToken(orderId);

  const query = useAsyncResource(
    (signal) => {
      if (!resolvedAccessToken) {
        return Promise.reject(
          new Error(
            "Order access token is required. Open this page from Order Confirmation or Order History.",
          ),
        );
      }
      return fetchOrderCompletion(orderId, {
        signal,
        accessToken: resolvedAccessToken,
      });
    },
    {
      deps: [orderId, resolvedAccessToken],
    },
  );

  useEffect(() => {
    if (query.status === "success" && query.data && resolvedAccessToken) {
      rememberCustomerOrder({
        orderId: query.data.orderId,
        accessToken: resolvedAccessToken,
        orderNumber: query.data.orderNumber,
      });
    }
  }, [query.status, query.data, resolvedAccessToken]);

  const showLoadState =
    Boolean(resolvedAccessToken) &&
    (query.status === "loading" ||
      query.status === "error" ||
      query.status === "empty");

  return (
    <main className="order-completed-page" id="main-content" tabIndex={-1}>
      <div className="order-completed-page__inner">
        <div className="order-completed-page__top">
          <Link href="/" className="order-completed-page__back">
            ← Back
          </Link>
          <Link href="/order-history" className="order-completed-page__back">
            Order History
          </Link>
        </div>

        <h1 className="order-completed-page__title">Order Completed</h1>

        {!resolvedAccessToken ? (
          <div className="order-completed-banner" role="alert">
            <p className="order-completed-banner__message">
              Order access token is required.
            </p>
            <p className="order-completed-banner__sub">
              Open this page from Order Confirmation or{" "}
              <Link href="/order-history">Order History</Link>.
            </p>
          </div>
        ) : null}

        {showLoadState ? (
          <CatalogStatus
            status={query.status === "loading" ? "loading" : "error"}
            errorMessage={
              query.errorMessage ??
              (query.status === "empty" ? "Order not found." : null)
            }
            onRetry={
              query.status === "error" || query.status === "empty"
                ? query.reload
                : undefined
            }
          />
        ) : null}

        {query.status === "success" && query.data ? (
          <>
            <section className="order-completed-banner" aria-live="polite">
              <p className="order-completed-banner__message">Thank you</p>
              <p className="order-completed-banner__sub">
                {query.data.status === "completed"
                  ? "Pickup completed."
                  : `Pickup status: ${formatStatusLabel(query.data.status)}.`}
              </p>
              {isMockPaymentMode ? (
                <MockPaymentModeNotice className="order-completed-banner__mock-note" />
              ) : null}
            </section>

            <section
              className="order-completed-card"
              aria-labelledby="completed-order-number"
            >
              <h2
                id="completed-order-number"
                className="order-completed-card__title"
              >
                Order number
              </h2>
              <p className="order-completed-order-number">
                {query.data.orderNumber}
              </p>
            </section>

            <section
              className="order-completed-card"
              aria-labelledby="completed-boutique"
            >
              <h2
                id="completed-boutique"
                className="order-completed-card__title"
              >
                Boutique
              </h2>
              <p className="order-completed-meta">
                {query.data.pickupBoutique.name}
                <br />
                {query.data.pickupBoutique.address}
              </p>
              <p className="order-completed-meta">
                Pickup date
                <br />
                {formatPickupDateKeyLong(query.data.pickup.dateKey)}
              </p>
              <p className="order-completed-meta">
                Pickup time
                <br />
                {query.data.pickup.timeSlotLabel}
              </p>
            </section>

            <section
              className="order-completed-card"
              aria-labelledby="completed-items"
            >
              <h2 id="completed-items" className="order-completed-card__title">
                Ordered products
              </h2>
              <ul className="order-completed-list">
                {query.data.items.map((item, index) => {
                  const modifiers = formatModifierLine(item.modifiers);
                  return (
                    <li key={`${item.productId}-${index}`}>
                      <span>
                        {item.name}
                        {modifiers ? (
                          <span className="order-completed-list__modifiers">
                            {modifiers}
                          </span>
                        ) : null}
                      </span>
                      <span>× {item.quantity}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="order-completed-totals">
                <div className="order-completed-totals__row total">
                  <span>Total amount</span>
                  <span>{formatPriceThb(query.data.totalThb)}</span>
                </div>
              </div>
            </section>

            <section
              className="order-completed-card"
              aria-labelledby="completed-payment"
            >
              <h2
                id="completed-payment"
                className="order-completed-card__title"
              >
                Payment status
              </h2>
              <p className="order-completed-meta">
                {formatStatusLabel(query.data.paymentStatus)}
                {query.data.paymentMethodLabel
                  ? ` — ${query.data.paymentMethodLabel}`
                  : ""}
              </p>
              <p className="order-completed-meta">
                Pickup completed
                <br />
                {formatDateTimeBangkok(query.data.completedAt)}
              </p>
            </section>

            {query.data.timeline.length > 0 ? (
              <section
                className="order-completed-card"
                aria-labelledby="completed-timeline"
              >
                <h2
                  id="completed-timeline"
                  className="order-completed-card__title"
                >
                  Timeline
                </h2>
                <ol className="order-completed-timeline">
                  {query.data.timeline.map((entry, index) => (
                    <li key={`${entry.status}-${entry.changedAt}-${index}`}>
                      <span className="order-completed-timeline__status">
                        {formatStatusLabel(entry.status)}
                      </span>
                      <span className="order-completed-timeline__time">
                        {formatDateTimeBangkok(entry.changedAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <div className="order-completed-actions">
              {resolvedAccessToken ? (
                <Link
                  href={buildOrderReceiptPath({
                    orderId: query.data.orderId,
                    accessToken: resolvedAccessToken,
                  })}
                  className="order-completed-btn order-completed-btn--primary"
                >
                  View Payment Receipt
                </Link>
              ) : null}
              <div className="order-completed-actions__secondary">
                <Link
                  href="/order-history"
                  className="order-completed-btn order-completed-btn--secondary"
                >
                  Order History
                </Link>
                <Link
                  href="/"
                  className="order-completed-btn order-completed-btn--secondary"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
