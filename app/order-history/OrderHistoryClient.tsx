"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderHistory } from "@/lib/api/orders";
import type { OrderHistoryItem } from "@/lib/api/types";
import { listRememberedOrderIds } from "@/lib/customer-orders";
import CatalogStatus from "../catalog/CatalogStatus";
import { useAsyncResource } from "../catalog/useAsyncResource";
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

export default function OrderHistoryClient() {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const query = useAsyncResource(
    (signal) => fetchOrderHistory(listRememberedOrderIds(), { signal }),
    {
      isEmpty: (data) => data.length === 0,
    },
  );

  const filtered = useMemo(() => {
    if (!query.data) return [];
    return query.data.filter((item) => matchesFilter(item, filter));
  }, [query.data, filter]);

  const showLoadState =
    query.status === "loading" || query.status === "error";

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
            status={query.status === "loading" ? "loading" : "error"}
            errorMessage={query.errorMessage}
            onRetry={query.status === "error" ? query.reload : undefined}
          />
        ) : null}

        {query.status === "empty" ? (
          <div className="order-history-empty" role="status">
            No orders yet. Place an order to see it here.
          </div>
        ) : null}

        {query.status === "success" ? (
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
                    {item.boutiqueName}
                    <br />
                    {formatPickupDateKeyLong(item.pickupDateKey)} —{" "}
                    {item.pickupTimeSlotLabel}
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
                    {item.status === "completed"
                      ? "View completion"
                      : "View order"}
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
