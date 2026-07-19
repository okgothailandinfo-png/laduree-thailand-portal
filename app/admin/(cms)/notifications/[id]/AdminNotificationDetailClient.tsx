"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  fetchAdminNotification,
  retryAdminNotification,
} from "@/lib/api/admin-notifications";
import type { AdminNotificationDetailDto } from "@/src/server/admin/notification.service";
import AdminEmptyState from "../../../components/AdminEmptyState";
import AdminPageHeader from "../../../components/AdminPageHeader";

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
    second: "2-digit",
    hour12: false,
  });
}

export default function AdminNotificationDetailClient({
  id,
}: {
  id: string;
}) {
  const [detail, setDetail] = useState<AdminNotificationDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminNotification(id);
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load notification.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleRetry = async () => {
    setRetrying(true);
    setSuccess(null);
    setError(null);
    try {
      const data = await retryAdminNotification(id);
      setDetail(data);
      setSuccess("Job reset for retry. Use Process pending to send.");
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to retry notification.",
      );
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <AdminEmptyState title="Loading" text="Loading notification…" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="admin-page">
        <AdminPageHeader title="Notification" />
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
        <Link href="/admin/notifications" className="admin-link">
          Back to notifications
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="admin-page">
        <AdminEmptyState title="Not found" text="Notification job not found." />
      </div>
    );
  }

  const canRetry = detail.status === "FAILED" || detail.status === "DEAD";

  return (
    <div className="admin-page">
      <AdminPageHeader
        title={`Notification ${detail.eventType}`}
        description="Job detail and delivery attempts."
      />

      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="admin-alert admin-alert--success" role="status">
          <p>{success}</p>
        </div>
      ) : null}

      <div className="admin-toolbar">
        <Link href="/admin/notifications" className="admin-btn admin-btn--secondary">
          Back
        </Link>
        {canRetry ? (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={retrying}
            onClick={() => void handleRetry()}
          >
            {retrying ? "Retrying…" : "Manual retry"}
          </button>
        ) : null}
      </div>

      <dl className="admin-detail-list">
        <div>
          <dt>Status</dt>
          <dd>{detail.status}</dd>
        </div>
        <div>
          <dt>Channel</dt>
          <dd>{detail.channel}</dd>
        </div>
        <div>
          <dt>Recipient</dt>
          <dd>{detail.recipientMasked}</dd>
        </div>
        <div>
          <dt>Order</dt>
          <dd>
            {detail.orderId && detail.orderNumber ? (
              <Link
                href={`/admin/orders/${detail.orderId}`}
                className="admin-link"
              >
                {detail.orderNumber}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Template</dt>
          <dd>{detail.templateKey}</dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>
            {detail.attemptCount}/{detail.maxAttempts}
          </dd>
        </div>
        <div>
          <dt>Scheduled</dt>
          <dd>{formatDateTime(detail.scheduledAt)}</dd>
        </div>
        <div>
          <dt>Processed</dt>
          <dd>{formatDateTime(detail.processedAt)}</dd>
        </div>
        <div>
          <dt>Last error</dt>
          <dd>{detail.lastErrorCode ?? "—"}</dd>
        </div>
        <div>
          <dt>Idempotency key</dt>
          <dd>{detail.idempotencyKey}</dd>
        </div>
      </dl>

      <h3 className="admin-section-title">Payload summary</h3>
      <dl className="admin-detail-list">
        {Object.entries(detail.payloadSummary).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>

      <h3 className="admin-section-title">Attempt logs</h3>
      {detail.logs.length === 0 ? (
        <AdminEmptyState title="No attempts" text="No delivery attempts yet." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Message ID</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {detail.logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDateTime(log.attemptedAt)}</td>
                <td>{log.provider}</td>
                <td>{log.status}</td>
                <td>{log.providerMessageId ?? "—"}</td>
                <td>{log.errorCode ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
