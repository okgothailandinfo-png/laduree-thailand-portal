"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  fetchAdminNotifications,
  processAdminNotifications,
} from "@/lib/api/admin-notifications";
import type { AdminNotificationListItemDto } from "@/src/server/admin/notification.service";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationJobStatus,
} from "@/src/server/notifications/types";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminPagination from "../../components/AdminPagination";
import AdminSearch from "../../components/AdminSearch";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
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

function statusBadgeClass(status: NotificationJobStatus): string {
  if (status === "SENT") return "admin-badge admin-badge--active";
  if (status === "FAILED" || status === "DEAD") {
    return "admin-badge admin-badge--inactive";
  }
  if (status === "SKIPPED") return "admin-badge";
  return "admin-badge admin-badge--ready";
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Skipped" },
  { value: "DEAD", label: "Dead" },
];

const CHANNEL_OPTIONS = [
  { value: "all", label: "All channels" },
  { value: "EMAIL", label: "Email" },
  { value: "LINE", label: "LINE" },
];

const EVENT_OPTIONS = [
  { value: "all", label: "All events" },
  { value: "ORDER_CONFIRMED", label: "Order confirmed" },
  { value: "PAYMENT_SUCCEEDED", label: "Payment succeeded" },
  { value: "PAYMENT_FAILED", label: "Payment failed" },
  { value: "ORDER_PREPARING", label: "Order preparing" },
  { value: "ORDER_READY_FOR_PICKUP", label: "Ready for pickup" },
  { value: "ORDER_CANCELLED", label: "Order cancelled" },
  { value: "PICKUP_COMPLETED", label: "Pickup completed" },
];

export default function AdminNotificationsClient() {
  const [items, setItems] = useState<AdminNotificationListItemDto[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminNotifications({
        search: debouncedSearch || undefined,
        status:
          status === "all" ? undefined : (status as NotificationJobStatus),
        channel:
          channel === "all" ? undefined : (channel as NotificationChannel),
        eventType:
          eventType === "all"
            ? undefined
            : (eventType as NotificationEventType),
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, channel, eventType, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadNotifications]);

  const handleProcess = async () => {
    setProcessing(true);
    setSuccess(null);
    setError(null);
    try {
      const result = await processAdminNotifications();
      setSuccess(
        `Processed ${result.processed}: ${result.sent} sent, ${result.failed} failed, ${result.dead} dead, ${result.retried} retried.`,
      );
      await loadNotifications();
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to process notifications.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const columns: AdminTableColumn<AdminNotificationListItemDto>[] = [
    {
      key: "event",
      header: "Event",
      render: (row) => (
        <Link href={`/admin/notifications/${row.id}`} className="admin-link">
          {row.eventType}
        </Link>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      render: (row) => row.channel,
    },
    {
      key: "order",
      header: "Order",
      render: (row) =>
        row.orderId && row.orderNumber ? (
          <Link href={`/admin/orders/${row.orderId}`} className="admin-link">
            {row.orderNumber}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (row) => row.recipientMasked,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={statusBadgeClass(row.status)}>{row.status}</span>
      ),
    },
    {
      key: "attempts",
      header: "Attempts",
      render: (row) => `${row.attemptCount}/${row.maxAttempts}`,
    },
    {
      key: "scheduled",
      header: "Scheduled",
      render: (row) => formatDateTime(row.scheduledAt),
    },
    {
      key: "processed",
      header: "Processed",
      render: (row) => formatDateTime(row.processedAt),
    },
    {
      key: "error",
      header: "Error",
      render: (row) => row.lastErrorCode ?? "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link
          href={`/admin/notifications/${row.id}`}
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
        title="Notifications"
        description="Notification jobs and delivery status (mock providers)."
      />

      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void loadNotifications()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="admin-alert admin-alert--success" role="status">
          <p>{success}</p>
        </div>
      ) : null}

      <div className="admin-toolbar">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search order #, recipient, template…"
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
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setPage(1);
          }}
          options={CHANNEL_OPTIONS}
          label="Channel"
        />
        <AdminFilter
          value={eventType}
          onChange={(value) => {
            setEventType(value);
            setPage(1);
          }}
          options={EVENT_OPTIONS}
          label="Event"
        />
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={processing}
          onClick={() => void handleProcess()}
        >
          {processing ? "Processing…" : "Process pending"}
        </button>
        <Link
          href="/admin/settings/notifications"
          className="admin-btn admin-btn--secondary"
        >
          Settings
        </Link>
      </div>

      {loading ? (
        <AdminEmptyState title="Loading" text="Loading notifications…" />
      ) : items.length === 0 && !error ? (
        <AdminEmptyState
          title="No notification jobs"
          text="Jobs appear after order events. Try Process pending after events enqueue."
        />
      ) : !error ? (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            emptyMessage="No notification jobs."
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
