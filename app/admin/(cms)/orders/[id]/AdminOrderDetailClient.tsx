"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AdminApiError,
  fetchAdminOrder,
  updateAdminOrderStatus,
} from "@/lib/api/admin-orders";
import type {
  AdminOrderDetailDto,
  AdminOrderStatus,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../../components/AdminEmptyState";
import AdminForm, { AdminFormField } from "../../../components/AdminForm";
import AdminPageHeader from "../../../components/AdminPageHeader";

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

function statusLabel(status: AdminOrderStatus | null): string {
  if (!status) return "—";
  return status.replaceAll("_", " ");
}

function orderBadgeClass(status: AdminOrderStatus): string {
  if (status === "completed") return "admin-badge admin-badge--active";
  if (status === "cancelled") return "admin-badge admin-badge--inactive";
  if (status === "ready_for_pickup") return "admin-badge admin-badge--ready";
  return "admin-badge";
}

export default function AdminOrderDetailClient({
  orderId,
}: {
  orderId: string;
}) {
  const [order, setOrder] = useState<AdminOrderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOrder(orderId);
      setOrder(data);
      setNextStatus(data.allowedNextStatuses[0] ?? "");
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load order.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrder]);

  async function submitStatusChange() {
    if (!order || !nextStatus) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminOrderStatus(order.id, {
        status: nextStatus as AdminOrderStatus,
        note: note.trim() || null,
      });
      setOrder(updated);
      setNextStatus(updated.allowedNextStatuses[0] ?? "");
      setNote("");
      setConfirmOpen(false);
      setSuccess(`Status updated to ${statusLabel(updated.orderStatus)}.`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to update order status.",
      );
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminEmptyState title="Loading" text="Loading order…" />;
  }

  if (error && !order) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void loadOrder()}
          >
            Retry
          </button>
        </div>
        <Link href="/admin/orders" className="admin-btn admin-btn--secondary">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <AdminEmptyState title="Order not found" text="This order does not exist." />
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-toolbar admin-toolbar--spaced">
        <Link href="/admin/orders" className="admin-btn admin-btn--secondary">
          Back to orders
        </Link>
      </div>

      <AdminPageHeader
        title={order.orderNumber}
        description="Order detail and status management."
      />

      {success ? (
        <div className="admin-alert admin-alert--success" role="status">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-order-grid">
        <section className="admin-panel">
          <h3 className="admin-panel__title">Summary</h3>
          <dl className="admin-dl">
            <div>
              <dt>Order status</dt>
              <dd>
                <span className={orderBadgeClass(order.orderStatus)}>
                  {statusLabel(order.orderStatus)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>
                <span
                  className={
                    order.paymentStatus === "mock_accepted"
                      ? "admin-badge admin-badge--active"
                      : order.paymentStatus === "failed"
                        ? "admin-badge admin-badge--inactive"
                        : "admin-badge"
                  }
                >
                  {order.paymentStatus.replaceAll("_", " ")}
                </span>
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>{order.paymentMethodLabel ?? "—"}</dd>
            </div>
            <div>
              <dt>Payment reference</dt>
              <dd className="admin-mono">{order.paymentReference ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel">
          <h3 className="admin-panel__title">Customer</h3>
          <dl className="admin-dl">
            <div>
              <dt>Name</dt>
              <dd>{order.customer.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.customer.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{order.customer.phone}</dd>
            </div>
            {order.customer.recipientName ? (
              <div>
                <dt>Recipient</dt>
                <dd>
                  {order.customer.recipientName}
                  {order.customer.recipientPhone
                    ? ` · ${order.customer.recipientPhone}`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="admin-panel">
          <h3 className="admin-panel__title">Pickup</h3>
          <dl className="admin-dl">
            <div>
              <dt>Boutique</dt>
              <dd>
                {order.boutique.name} ({order.boutique.code})
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{order.boutique.address}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{order.pickup.date}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{order.pickup.time}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Items</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Qty</th>
                <th scope="col">Unit</th>
                <th scope="col">Line</th>
                <th scope="col">Modifiers</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.productId}-${index}`}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.unitPriceThb)}</td>
                  <td>{formatPrice(item.lineTotalThb)}</td>
                  <td>
                    {item.modifiers.length > 0
                      ? item.modifiers
                          .map((modifier) =>
                            modifier.quantity
                              ? `${modifier.label} ×${modifier.quantity}`
                              : modifier.label,
                          )
                          .join(", ")
                      : "—"}
                  </td>
                  <td>{item.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="admin-dl admin-dl--totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotalThb)}</dd>
          </div>
          {order.taxThb !== null ? (
            <div>
              <dt>Tax</dt>
              <dd>{formatPrice(order.taxThb)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Total</dt>
            <dd>
              <strong>{formatPrice(order.totalThb)}</strong>
            </dd>
          </div>
        </dl>
        {order.notes ? (
          <p className="admin-order-notes">
            <strong>Notes:</strong> {order.notes}
          </p>
        ) : null}
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Update status</h3>
        {order.allowedNextStatuses.length === 0 ? (
          <p className="admin-muted-text">
            No further status transitions are allowed for this order.
          </p>
        ) : (
          <AdminForm
            submitLabel={saving ? "Saving…" : "Update status"}
            disabled={saving || !nextStatus}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <AdminFormField label="Next status" htmlFor="order-next-status">
              <select
                id="order-next-status"
                className="admin-filter__select"
                value={nextStatus}
                disabled={saving}
                onChange={(event) => setNextStatus(event.target.value)}
                required
              >
                {order.allowedNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label="Note (optional)" htmlFor="order-status-note">
              <textarea
                id="order-status-note"
                className="admin-textarea"
                rows={3}
                value={note}
                disabled={saving}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Operational note"
              />
            </AdminFormField>
          </AdminForm>
        )}

        {confirmOpen ? (
          <div className="admin-confirm" role="dialog" aria-modal="true">
            <p>
              Change status from{" "}
              <strong>{statusLabel(order.orderStatus)}</strong> to{" "}
              <strong>{statusLabel(nextStatus as AdminOrderStatus)}</strong>?
            </p>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={saving}
                onClick={() => void submitStatusChange()}
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={saving}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Status timeline</h3>
        {order.history.length === 0 ? (
          <p className="admin-muted-text">No status history yet.</p>
        ) : (
          <ol className="admin-timeline">
            {order.history.map((entry) => (
              <li key={entry.id} className="admin-timeline__item">
                <div className="admin-timeline__meta">
                  {formatDateTime(entry.createdAt)}
                  {entry.changedBy ? ` · ${entry.changedBy}` : ""}
                </div>
                <div>
                  {statusLabel(entry.fromStatus)} →{" "}
                  <strong>{statusLabel(entry.toStatus)}</strong>
                </div>
                {entry.note ? (
                  <div className="admin-muted-text">{entry.note}</div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
