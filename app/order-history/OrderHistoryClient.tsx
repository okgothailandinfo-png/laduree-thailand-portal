"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderHistory } from "@/lib/api/orders";
import type { OrderHistoryItem } from "@/lib/api/types";
import { listRememberedOrderIds } from "@/lib/customer-orders";
import {
  formatMockOrderStatus,
  formatMockServiceType,
  listMockMemberOrders,
} from "@/lib/customer/mock-order-history";
import type { MockOrderHistoryEntry } from "@/lib/customer/types";
import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
import { useCustomerSession } from "../customer/CustomerSessionContext";
import {
  formatDateTimeBangkok,
  formatStatusLabel,
} from "../order-completed/format";
import "../order-completed/order-completed.css";
import { formatPickupDateKeyLong } from "../pickup/pickup-dates";

type HistoryFilter = "all" | "completed" | "cancelled" | "active";

function matchesFilter(item: OrderHistoryItem, filter: HistoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return item.status === "completed";
  if (filter === "cancelled") return item.status === "cancelled";
  return item.status !== "completed" && item.status !== "cancelled";
}

function matchesMockFilter(
  item: MockOrderHistoryEntry,
  filter: HistoryFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return item.status === "completed";
  if (filter === "cancelled") return item.status === "cancelled";
  return item.status !== "completed" && item.status !== "cancelled";
}

function formatMockDate(dateKey: string): string {
  // DD/MM/YYYY (Thailand locale default)
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}/${month}/${year}`;
}

export default function OrderHistoryClient() {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const { isAuthenticated, email, ready } = useCustomerSession();

  const guestQuery = useAsyncResource(
    (signal) => fetchOrderHistory(listRememberedOrderIds(), { signal }),
    {
      isEmpty: (data) => data.length === 0,
      deps: [ready, isAuthenticated],
    },
  );

  const mockOrders = useMemo(() => {
    if (!isAuthenticated) return [];
    return listMockMemberOrders(email);
  }, [isAuthenticated, email]);

  const filteredGuest = useMemo(() => {
    if (!guestQuery.data) return [];
    return guestQuery.data.filter((item) => matchesFilter(item, filter));
  }, [guestQuery.data, filter]);

  const filteredMock = useMemo(() => {
    return mockOrders.filter((item) => matchesMockFilter(item, filter));
  }, [mockOrders, filter]);

  if (!ready) {
    return (
      <main className="order-history-page">
        <div className="order-history-page__inner">
          <h1 className="order-completed-page__title">Order History</h1>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return (
      <main className="order-history-page">
        <div className="order-history-page__inner">
          <div className="order-completed-page__top">
            <Link href="/" className="order-completed-page__back">
              ← Back
            </Link>
          </div>

          <h1 className="order-completed-page__title">Order History</h1>

          <div
            className="order-history-filters"
            role="tablist"
            aria-label="Filter"
          >
            {(
              [
                ["all", "All"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
                ["active", "Active"],
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

          {filteredMock.length === 0 ? (
            <div className="order-history-empty" role="status">
              No orders match this filter.
            </div>
          ) : (
            <ul className="order-history-list">
              {filteredMock.map((item) => (
                <li key={item.orderId} className="order-history-item">
                  <div className="order-history-item__header">
                    <p className="order-history-item__number">
                      {item.orderNumber}
                    </p>
                    <p className="order-history-item__status">
                      {formatMockOrderStatus(item.status)}
                    </p>
                  </div>
                  <p className="order-history-item__meta">
                    Date: {formatMockDate(item.date)}
                    <br />
                    {formatMockServiceType(item.serviceType)}
                    <br />
                    Payment Method: {item.paymentMethodLabel}
                    <br />
                    Payment Status: {item.paymentStatus}
                    <br />
                    Fulfilment Status: {item.fulfilmentStatus}
                    <br />
                    Total: {formatPriceThb(item.totalThb)}
                  </p>
                  <Link
                    href={item.detailPath}
                    className="order-history-item__link"
                  >
                    View Details
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    );
  }

  const showLoadState =
    guestQuery.status === "loading" || guestQuery.status === "error";

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
            status={guestQuery.status === "loading" ? "loading" : "error"}
            errorMessage={guestQuery.errorMessage}
            onRetry={guestQuery.status === "error" ? guestQuery.reload : undefined}
          />
        ) : null}

        {guestQuery.status === "empty" ? (
          <div className="order-history-empty" role="status">
            No orders yet. Place an order to see it here.
          </div>
        ) : null}

        {guestQuery.status === "success" ? (
          filteredGuest.length === 0 ? (
            <div className="order-history-empty" role="status">
              No orders match this filter.
            </div>
          ) : (
            <ul className="order-history-list">
              {filteredGuest.map((item) => (
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
                  <Link
                    href={
                      item.status === "completed"
                        ? `/order-completed/${encodeURIComponent(item.orderId)}`
                        : `/order-confirmation?orderId=${encodeURIComponent(item.orderId)}`
                    }
                    className="order-history-item__link"
                  >
                    View Details
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </main>
  );
}
