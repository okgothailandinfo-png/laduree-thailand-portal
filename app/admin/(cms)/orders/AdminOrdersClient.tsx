"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  fetchAdminOrderBoutiques,
  fetchAdminOrders,
} from "@/lib/api/admin-orders";
import type {
  AdminOrderListItemDto,
  AdminOrderStatus,
  AdminPaymentStatus,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminPagination from "../../components/AdminPagination";
import AdminSearch from "../../components/AdminSearch";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

function formatPrice(thb: number): string {
  return `฿${thb.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusLabel(status: AdminOrderStatus): string {
  return status.replaceAll("_", " ");
}

function paymentLabel(status: AdminPaymentStatus): string {
  return status.replaceAll("_", " ");
}

function orderBadgeClass(status: AdminOrderStatus): string {
  if (status === "completed") return "admin-badge admin-badge--active";
  if (status === "cancelled") return "admin-badge admin-badge--inactive";
  if (status === "ready_for_pickup") return "admin-badge admin-badge--ready";
  return "admin-badge";
}

function paymentBadgeClass(status: AdminPaymentStatus): string {
  if (status === "mock_accepted") return "admin-badge admin-badge--active";
  if (status === "failed") return "admin-badge admin-badge--inactive";
  return "admin-badge";
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "mock_placed", label: "Mock placed" },
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "pending", label: "Pending" },
  { value: "mock_accepted", label: "Mock accepted" },
  { value: "failed", label: "Failed" },
];

export default function AdminOrdersClient() {
  const [items, setItems] = useState<AdminOrderListItemDto[]>([]);
  const [boutiques, setBoutiques] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [boutiqueId, setBoutiqueId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadBoutiques = useCallback(async () => {
    const result = await fetchAdminOrderBoutiques();
    setBoutiques(result);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminOrders({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : (status as AdminOrderStatus),
        paymentStatus:
          paymentStatus === "all"
            ? undefined
            : (paymentStatus as Exclude<AdminPaymentStatus, "none">),
        boutiqueId: boutiqueId === "all" ? undefined : boutiqueId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    status,
    paymentStatus,
    boutiqueId,
    dateFrom,
    dateTo,
    page,
  ]);

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

  const columns: AdminTableColumn<AdminOrderListItemDto>[] = [
    {
      key: "orderNumber",
      header: "Order",
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="admin-link">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div>
          <div>{row.customerName}</div>
          <div className="admin-muted-text">{row.customerEmail}</div>
          <div className="admin-muted-text">{row.customerPhone}</div>
        </div>
      ),
    },
    {
      key: "boutique",
      header: "Boutique",
      render: (row) => row.boutiqueName,
    },
    {
      key: "pickup",
      header: "Pickup",
      render: (row) => (
        <div>
          <div>{row.pickupDate}</div>
          <div className="admin-muted-text">{row.pickupTime}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (row) => row.itemCount,
    },
    {
      key: "total",
      header: "Total",
      render: (row) => formatPrice(row.totalThb),
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => (
        <span className={paymentBadgeClass(row.paymentStatus)}>
          {paymentLabel(row.paymentStatus)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={orderBadgeClass(row.orderStatus)}>
          {statusLabel(row.orderStatus)}
        </span>
      ),
    },
    {
      key: "created",
      header: "Created",
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link
          href={`/admin/orders/${row.id}`}
          className="admin-btn admin-btn--secondary"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Orders"
        description="Review and manage pickup orders."
      />

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

      <div className="admin-toolbar">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search order #, name, email, phone…"
        />
        <AdminFilter
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          label="Status"
        />
        <AdminFilter
          value={paymentStatus}
          onChange={(value) => {
            setPaymentStatus(value);
            setPage(1);
          }}
          options={PAYMENT_OPTIONS}
          label="Payment"
        />
        <AdminFilter
          value={boutiqueId}
          onChange={(value) => {
            setBoutiqueId(value);
            setPage(1);
          }}
          options={boutiqueOptions}
          label="Boutique"
        />
        <label className="admin-filter">
          <span className="admin-filter__label">From</span>
          <input
            type="date"
            className="admin-input"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="admin-filter">
          <span className="admin-filter__label">To</span>
          <input
            type="date"
            className="admin-input"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      {loading ? (
        <AdminEmptyState title="Loading" text="Loading orders…" />
      ) : items.length === 0 && !error ? (
        <AdminEmptyState
          title="No orders found"
          text="Try adjusting search or filters."
        />
      ) : !error ? (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            emptyMessage="No orders found."
            getRowKey={(row) => row.id}
          />
          <AdminPagination
            page={page}
            pageSize={10}
            total={total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
