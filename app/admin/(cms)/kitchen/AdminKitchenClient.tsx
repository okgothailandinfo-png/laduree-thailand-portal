"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AdminApiError,
  fetchAdminKitchenOrders,
} from "@/lib/api/admin-kitchen";
import {
  fetchAdminOrderBoutiques,
  updateAdminOrderStatus,
} from "@/lib/api/admin-orders";
import type {
  AdminKitchenOrderDto,
  AdminOrderStatus,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminSearch from "../../components/AdminSearch";

const AUTO_REFRESH_MS = 30_000;

type KitchenColumnId =
  | "new_confirmed"
  | "preparing"
  | "ready"
  | "completed";

const COLUMNS: Array<{
  id: KitchenColumnId;
  title: string;
  statuses: readonly AdminOrderStatus[];
}> = [
  {
    id: "new_confirmed",
    title: "New / Confirmed",
    statuses: ["confirmed", "mock_placed"],
  },
  {
    id: "preparing",
    title: "Preparing",
    statuses: ["preparing"],
  },
  {
    id: "ready",
    title: "Ready for Pickup",
    statuses: ["ready_for_pickup"],
  },
  {
    id: "completed",
    title: "Completed",
    statuses: ["completed"],
  },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All board statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
];

function bangkokTodayDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusLabel(status: AdminOrderStatus): string {
  if (status === "ready_for_pickup") return "Ready for pickup";
  if (status === "mock_placed") return "Mock placed";
  return status.replaceAll("_", " ");
}

function paymentLabel(status: AdminKitchenOrderDto["paymentStatus"]): string {
  return status.replaceAll("_", " ");
}

function orderBadgeClass(status: AdminOrderStatus): string {
  if (status === "completed") return "admin-badge admin-badge--active";
  if (status === "cancelled") return "admin-badge admin-badge--inactive";
  if (status === "ready_for_pickup") return "admin-badge admin-badge--ready";
  if (status === "preparing") return "admin-badge admin-badge--preparing";
  if (status === "confirmed" || status === "mock_placed") {
    return "admin-badge admin-badge--new";
  }
  return "admin-badge";
}

function paymentBadgeClass(
  status: AdminKitchenOrderDto["paymentStatus"],
): string {
  if (status === "mock_accepted") return "admin-badge admin-badge--active";
  if (status === "failed") return "admin-badge admin-badge--inactive";
  return "admin-badge";
}

function actionLabel(status: AdminOrderStatus): string {
  if (status === "preparing") return "Start Preparing";
  if (status === "ready_for_pickup") return "Mark Ready for Pickup";
  if (status === "completed") return "Mark Completed";
  if (status === "cancelled") return "Cancel";
  return `Mark ${statusLabel(status)}`;
}

function actionButtonClass(status: AdminOrderStatus): string {
  if (status === "cancelled") {
    return "admin-btn admin-btn--secondary admin-kitchen-card__action";
  }
  return "admin-btn admin-btn--primary admin-kitchen-card__action";
}

function formatElapsed(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatPickupDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminKitchenClient() {
  const [items, setItems] = useState<AdminKitchenOrderDto[]>([]);
  const [boutiques, setBoutiques] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [date, setDate] = useState(bangkokTodayDateKey);
  const [boutiqueId, setBoutiqueId] = useState("all");
  const [status, setStatus] = useState("all");
  const [pickupTime, setPickupTime] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const updatingRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadBoutiques = useCallback(async () => {
    const result = await fetchAdminOrderBoutiques();
    setBoutiques(result);
  }, []);

  const loadOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await fetchAdminKitchenOrders({
          date,
          boutiqueId: boutiqueId === "all" ? undefined : boutiqueId,
          status: status === "all" ? undefined : (status as AdminOrderStatus),
          search: debouncedSearch || undefined,
        });
        setItems(result.items);
        setLastRefreshedAt(new Date().toISOString());
      } catch (err) {
        setError(
          err instanceof AdminApiError
            ? err.message
            : "Unable to load kitchen orders.",
        );
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [date, boutiqueId, status, debouncedSearch],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBoutiques().catch(() => {
        // Boutique filter is optional if public API fails.
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBoutiques]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  // Auto-refresh every 30s; pause while a status update is in flight.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (updatingRef.current) return;
      void loadOrders({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  const boutiqueOptions = useMemo(
    () => [
      { value: "all", label: "All boutiques" },
      ...boutiques.map((boutique) => ({
        value: boutique.id,
        label: boutique.name,
      })),
    ],
    [boutiques],
  );

  const pickupTimeOptions = useMemo(() => {
    const times = [...new Set(items.map((item) => item.pickupTime))].sort();
    return [
      { value: "all", label: "All pickup times" },
      ...times.map((time) => ({ value: time, label: time })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (pickupTime === "all") return items;
    return items.filter((item) => item.pickupTime === pickupTime);
  }, [items, pickupTime]);

  const columnsWithOrders = useMemo(() => {
    return COLUMNS.map((column) => ({
      ...column,
      orders: filteredItems.filter((item) =>
        column.statuses.includes(item.orderStatus),
      ),
    }));
  }, [filteredItems]);

  async function handleStatusUpdate(
    order: AdminKitchenOrderDto,
    nextStatus: AdminOrderStatus,
  ) {
    if (updatingRef.current) return;

    updatingRef.current = true;
    setUpdatingOrderId(order.id);
    setError(null);
    setConflictMessage(null);

    try {
      await updateAdminOrderStatus(order.id, {
        status: nextStatus,
        expectedStatus: order.orderStatus,
      });
      // Refresh board so column placement and filters stay authoritative.
      await loadOrders({ silent: true });
    } catch (err) {
      if (
        err instanceof AdminApiError &&
        (err.status === 409 || err.code === "CONFLICT")
      ) {
        setConflictMessage(
          err.message || "Order status has changed. Refresh and try again.",
        );
        await loadOrders({ silent: true });
      } else {
        setError(
          err instanceof AdminApiError
            ? err.message
            : "Unable to update order status.",
        );
      }
    } finally {
      updatingRef.current = false;
      setUpdatingOrderId(null);
    }
  }

  const boardEmpty =
    !loading && !error && filteredItems.length === 0;

  return (
    <div className="admin-page admin-kitchen">
      <AdminPageHeader
        title="Kitchen"
        description="Today’s pickup preparation board. Mock admin session only — non-production authorization."
      />

      <div className="admin-kitchen-toolbar">
        <div className="admin-toolbar">
          <label className="admin-filter admin-kitchen-date">
            <span className="admin-filter__label">Pickup date</span>
            <input
              type="date"
              className="admin-input admin-kitchen-date__input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <AdminFilter
            label="Boutique"
            value={boutiqueId}
            options={boutiqueOptions}
            onChange={setBoutiqueId}
          />
          <AdminFilter
            label="Pickup time"
            value={pickupTime}
            options={pickupTimeOptions}
            onChange={setPickupTime}
          />
          <AdminFilter
            label="Status"
            value={status}
            options={STATUS_FILTER_OPTIONS}
            onChange={setStatus}
          />
          <AdminSearch
            value={search}
            onChange={setSearch}
            placeholder="Search order or customer"
          />
        </div>
        <div className="admin-kitchen-toolbar__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setDate(bangkokTodayDateKey())}
          >
            Today
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={loading || updatingOrderId !== null}
            onClick={() => void loadOrders()}
          >
            Refresh
          </button>
          <span className="admin-muted-text admin-kitchen-toolbar__meta">
            {updatingOrderId
              ? "Auto-refresh paused while updating…"
              : lastRefreshedAt
                ? `Auto-refresh 30s · last ${formatElapsed(lastRefreshedAt, nowMs)}`
                : "Auto-refresh 30s"}
          </span>
        </div>
      </div>

      {conflictMessage ? (
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{conflictMessage}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setConflictMessage(null);
              void loadOrders();
            }}
          >
            Refresh board
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void loadOrders()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <AdminEmptyState title="Loading" text="Loading kitchen orders…" />
      ) : null}

      {!loading && boardEmpty ? (
        <AdminEmptyState
          title="No orders"
          text={`No preparation orders for ${formatPickupDate(date)}.`}
        />
      ) : null}

      {!loading && !boardEmpty ? (
        <div className="admin-kitchen-board">
          {columnsWithOrders.map((column) => (
            <section
              key={column.id}
              className={`admin-kitchen-column admin-kitchen-column--${column.id}`}
              aria-label={column.title}
            >
              <header className="admin-kitchen-column__header">
                <h3 className="admin-kitchen-column__title">{column.title}</h3>
                <span className="admin-kitchen-column__count">
                  {column.orders.length}
                </span>
              </header>
              <div className="admin-kitchen-column__body">
                {column.orders.length === 0 ? (
                  <p className="admin-kitchen-column__empty">No orders</p>
                ) : (
                  column.orders.map((order) => {
                    const isUpdating = updatingOrderId === order.id;
                    return (
                      <article
                        key={order.id}
                        className={`admin-kitchen-card${isUpdating ? " admin-kitchen-card--updating" : ""}`}
                      >
                        <div className="admin-kitchen-card__top">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="admin-kitchen-card__order"
                          >
                            {order.orderNumber}
                          </Link>
                          <span className="admin-kitchen-card__pickup">
                            {order.pickupTime}
                          </span>
                        </div>
                        <p className="admin-kitchen-card__customer">
                          {order.customerName}
                        </p>
                        <p className="admin-kitchen-card__boutique">
                          {order.boutiqueName}
                        </p>
                        <p className="admin-kitchen-card__items">
                          <span className="admin-kitchen-card__item-count">
                            {order.itemCount} item
                            {order.itemCount === 1 ? "" : "s"}
                          </span>
                          <span className="admin-kitchen-card__summary">
                            {order.productSummary || "—"}
                          </span>
                        </p>
                        {order.customerNote ? (
                          <p className="admin-kitchen-card__note">
                            Note: {order.customerNote}
                          </p>
                        ) : null}
                        <div className="admin-kitchen-card__badges">
                          <span className={orderBadgeClass(order.orderStatus)}>
                            {statusLabel(order.orderStatus)}
                          </span>
                          <span
                            className={paymentBadgeClass(order.paymentStatus)}
                          >
                            {paymentLabel(order.paymentStatus)}
                          </span>
                        </div>
                        <p className="admin-kitchen-card__elapsed">
                          Updated {formatElapsed(order.updatedAt, nowMs)}
                          <span className="admin-muted-text">
                            {" "}
                            · created {formatElapsed(order.createdAt, nowMs)}
                          </span>
                        </p>
                        <div className="admin-kitchen-card__actions">
                          {order.allowedNextStatuses.length === 0 ? (
                            <span className="admin-muted-text">No actions</span>
                          ) : (
                            order.allowedNextStatuses.map((next) => (
                              <button
                                key={next}
                                type="button"
                                className={actionButtonClass(next)}
                                disabled={updatingOrderId !== null}
                                onClick={() =>
                                  void handleStatusUpdate(order, next)
                                }
                              >
                                {isUpdating
                                  ? "Updating…"
                                  : actionLabel(next)}
                              </button>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
