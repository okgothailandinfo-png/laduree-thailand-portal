"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderHistory } from "@/lib/api/orders";
import type { OrderHistoryItem } from "@/lib/api/types";
import { listRememberedOrders } from "@/lib/customer-orders";
import {
  buildOrderCompletedPath,
  buildOrderConfirmationPath,
} from "@/lib/orders/post-payment-session";
import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
import { useCustomerSession } from "../customer/CustomerSessionContext";
import {
  formatDateTimeBangkok,
  formatStatusLabel,
} from "../order-completed/format";
import "../order-completed/order-completed.css";
import {
  buildPaymentRecoveryPath,
  historyItemNeedsPaymentRecovery,
} from "../payment/payment-recovery";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";

type HistoryFilter = "all" | "completed" | "cancelled" | "active";

function matchesFilter(item: OrderHistoryItem, filter: HistoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return item.status === "completed";
  if (filter === "cancelled") return item.status === "cancelled";
  return item.status !== "completed" && item.status !== "cancelled";
}

/**
 * Sprint 28 — Order History uses tokenized remembered orders for both guest
 * and member sessions. Fabricated mock member rows are not shown in UAT.
 */
export default function OrderHistoryClient() {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const { ready } = useCustomerSession();

  const rememberedOrders = ready ? listRememberedOrders() : [];

  const historyQuery = useAsyncResource(
    (signal) =>
      fetchOrderHistory(
        rememberedOrders.map((entry) => ({
          orderId: entry.orderId,
          accessToken: entry.accessToken,
        })),
        { signal },
      ),
    {
      isEmpty: (data) => data.length === 0,
      deps: [ready, rememberedOrders.length],
    },
  );

  const filtered = useMemo(() => {
    if (!historyQuery.data) return [];
    return historyQuery.data.filter((item) => matchesFilter(item, filter));
  }, [historyQuery.data, filter]);

  if (!ready) {
    return (
      <main className="order-history-page">
        <div className="order-history-page__inner">
          <h1 className="order-completed-page__title">Order History</h1>
        </div>
      </main>
    );
  }

  const showLoadState =
    historyQuery.status === "loading" || historyQuery.status === "error";

  return (
    <main className="order-history-page">
      <div className="order-history-page__inner">
        <div className="order-completed-page__top">
          <Link href="/" className="order-completed-page__back">
            ← Back
          </Link>
        </div>

        <h1 className="order-completed-page__title">Order History</h1>

        <div className="order-history-filters" role="tablist" aria-label="Filter">
          {(
            [
              ["all", "All"],
              ["completed", "Completed"],
              ["cancelled", "Cancelled"],
              ["active", "Pickup status"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={`order-history-filter${
                filter === value ? " order-history-filter--active" : ""
              }`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {showLoadState ? (
          <CatalogStatus
            status={historyQuery.status === "loading" ? "loading" : "error"}
            errorMessage={historyQuery.errorMessage}
            onRetry={
              historyQuery.status === "error" ? historyQuery.reload : undefined
            }
          />
        ) : null}

        {historyQuery.status === "empty" ? (
          <div className="order-history-empty" role="status">
            No orders yet. Place an order to see it here.
          </div>
        ) : null}

        {historyQuery.status === "success" ? (
          filtered.length === 0 ? (
            <div className="order-history-empty" role="status">
              No orders match this filter.
            </div>
          ) : (
            <ul className="order-history-list">
              {filtered.map((item) => (
                <li key={item.orderId} className="order-history-item">
                  <div className="order-history-item__header">
                    <p className="order-history-item__number">
                      {item.orderNumber}
                    </p>
                    <p className="order-history-item__status">
                      {formatStatusLabel(item.pickupStatus)}
                    </p>
                  </div>
                  <p className="order-history-item__meta">
                    Date: {formatDateTimeBangkok(item.createdAt)}
                    <br />
                    {item.serviceType === "DELIVERY" ? "Delivery" : "Pick-up"}
                    <br />
                    Payment Method: {item.paymentMethodLabel ?? "—"}
                    <br />
                    Payment Status:{" "}
                    {item.paymentStatus === "mock_accepted"
                      ? "Succeeded"
                      : item.paymentStatus === "none"
                        ? "—"
                        : item.paymentStatus}
                    <br />
                    Fulfilment Status: {formatStatusLabel(item.fulfilmentStatus)}
                    <br />
                    {item.boutiqueName}
                    <br />
                    {item.pickupDateKey
                      ? `${formatPickupDateKeyLong(item.pickupDateKey)} — ${item.pickupTimeSlotLabel}`
                      : null}
                    <br />
                    Total: {formatPriceThb(item.totalThb)}
                    {item.completedAt ? (
                      <>
                        <br />
                        Pickup completed:{" "}
                        {formatDateTimeBangkok(item.completedAt)}
                      </>
                    ) : null}
                  </p>
                  {(() => {
                    const token = rememberedOrders.find(
                      (entry) => entry.orderId === item.orderId,
                    )?.accessToken;
                    if (!token) return null;
                    const href = historyItemNeedsPaymentRecovery(item)
                      ? buildPaymentRecoveryPath({
                          orderId: item.orderId,
                          accessToken: token,
                        })
                      : item.status === "completed"
                        ? buildOrderCompletedPath({
                            orderId: item.orderId,
                            accessToken: token,
                          })
                        : buildOrderConfirmationPath({
                            orderId: item.orderId,
                            accessToken: token,
                          });
                    return (
                      <Link
                        href={href}
                        className="order-history-item__link"
                      >
                        View Order Details
                      </Link>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </main>
  );
}
