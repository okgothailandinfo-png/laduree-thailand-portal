"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  fetchAdminOrder,
  updateAdminOrderPayment,
  updateAdminOrderStatus,
} from "@/lib/api/admin-orders";
import type {
  AdminOrderDetailDto,
  AdminOrderStatus,
  AdminPaymentStatus,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../../components/AdminEmptyState";
import { AdminFormField } from "../../../components/AdminForm";
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

function paymentLabel(status: AdminPaymentStatus): string {
  return status.replaceAll("_", " ");
}

function orderBadgeClass(status: AdminOrderStatus): string {
  if (status === "completed") return "admin-badge admin-badge--active";
  if (status === "cancelled") return "admin-badge admin-badge--inactive";
  if (status === "ready_for_pickup") return "admin-badge admin-badge--ready";
  if (status === "new") return "admin-badge admin-badge--new";
  return "admin-badge";
}

function paymentBadgeClass(status: AdminPaymentStatus): string {
  if (status === "mock_accepted") return "admin-badge admin-badge--active";
  if (status === "failed") return "admin-badge admin-badge--inactive";
  return "admin-badge";
}

const PAYMENT_NEXT: Record<
  Exclude<AdminPaymentStatus, "none">,
  Exclude<AdminPaymentStatus, "none">[]
> = {
  pending: ["mock_accepted", "failed"],
  failed: ["pending", "mock_accepted"],
  mock_accepted: ["failed"],
};

type ConfirmKind = "status" | "payment";

export default function AdminOrderDetailClient({
  orderId,
}: {
  orderId: string;
}) {
  const [order, setOrder] = useState<AdminOrderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<AdminOrderStatus | null>(
    null,
  );
  const [pendingPayment, setPendingPayment] = useState<Exclude<
    AdminPaymentStatus,
    "none"
  > | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOrder(orderId);
      setOrder(data);
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

  const paymentNextStatuses = useMemo(() => {
    if (!order || order.paymentStatus === "none") return [];
    return PAYMENT_NEXT[order.paymentStatus] ?? [];
  }, [order]);

  function openStatusConfirm(status: AdminOrderStatus) {
    setPendingStatus(status);
    setConfirmKind("status");
    setError(null);
    setSuccess(null);
  }

  function openPaymentConfirm(status: Exclude<AdminPaymentStatus, "none">) {
    setPendingPayment(status);
    setConfirmKind("payment");
    setError(null);
    setSuccess(null);
  }

  function closeConfirm() {
    if (saving) return;
    setConfirmKind(null);
    setPendingStatus(null);
    setPendingPayment(null);
  }

  async function submitStatusChange() {
    if (!order || !pendingStatus) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminOrderStatus(order.id, {
        status: pendingStatus,
        note: statusNote.trim() || null,
        expectedStatus: order.orderStatus,
      });
      setOrder(updated);
      setStatusNote("");
      setConfirmKind(null);
      setPendingStatus(null);
      setSuccess(`Status updated to ${statusLabel(updated.orderStatus)}.`);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to update order status.",
      );
      setConfirmKind(null);
      setPendingStatus(null);
    } finally {
      setSaving(false);
    }
  }

  async function submitPaymentChange() {
    if (!order || !pendingPayment) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminOrderPayment(order.id, {
        status: pendingPayment,
        note: paymentNote.trim() || null,
        expectedStatus:
          order.paymentStatus === "none" ? undefined : order.paymentStatus,
      });
      setOrder(updated);
      setPaymentNote("");
      setConfirmKind(null);
      setPendingPayment(null);
      setSuccess(
        `Payment status updated to ${paymentLabel(updated.paymentStatus)}.`,
      );
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to update payment status.",
      );
      setConfirmKind(null);
      setPendingPayment(null);
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
        description="Order detail and fulfillment workflow."
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
                <span className={paymentBadgeClass(order.paymentStatus)}>
                  {paymentLabel(order.paymentStatus)}
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
          <h3 className="admin-panel__title">Pickup location</h3>
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
        <h3 className="admin-panel__title">Ordered products</h3>
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
        <h3 className="admin-panel__title">Fulfillment actions</h3>
        {order.allowedNextStatuses.length === 0 ? (
          <p className="admin-muted-text">
            No further status transitions are allowed for this order.
          </p>
        ) : (
          <>
            <div className="admin-actions admin-actions--status">
              {order.allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={
                    status === "cancelled"
                      ? "admin-btn admin-btn--secondary"
                      : "admin-btn admin-btn--primary"
                  }
                  disabled={saving}
                  onClick={() => openStatusConfirm(status)}
                >
                  Mark {statusLabel(status)}
                </button>
              ))}
            </div>
            <AdminFormField label="Status note (optional)" htmlFor="order-status-note">
              <textarea
                id="order-status-note"
                className="admin-textarea"
                rows={2}
                value={statusNote}
                disabled={saving}
                onChange={(event) => setStatusNote(event.target.value)}
                placeholder="Operational note"
              />
            </AdminFormField>
          </>
        )}
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Payment</h3>
        {order.paymentStatus === "none" ? (
          <p className="admin-muted-text">No payment record on this order.</p>
        ) : paymentNextStatuses.length === 0 ? (
          <p className="admin-muted-text">Payment status cannot be changed.</p>
        ) : (
          <>
            <div className="admin-actions">
              {paymentNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  disabled={saving}
                  onClick={() => openPaymentConfirm(status)}
                >
                  Set payment {paymentLabel(status)}
                </button>
              ))}
            </div>
            <AdminFormField
              label="Payment note (optional)"
              htmlFor="order-payment-note"
            >
              <textarea
                id="order-payment-note"
                className="admin-textarea"
                rows={2}
                value={paymentNote}
                disabled={saving}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="Operational note"
              />
            </AdminFormField>
          </>
        )}
      </section>

      {confirmKind ? (
        <div className="admin-confirm" role="dialog" aria-modal="true">
          {confirmKind === "status" && pendingStatus ? (
            <p>
              Change order status from{" "}
              <strong>{statusLabel(order.orderStatus)}</strong> to{" "}
              <strong>{statusLabel(pendingStatus)}</strong>?
            </p>
          ) : null}
          {confirmKind === "payment" && pendingPayment ? (
            <p>
              Change payment status from{" "}
              <strong>{paymentLabel(order.paymentStatus)}</strong> to{" "}
              <strong>{paymentLabel(pendingPayment)}</strong>?
            </p>
          ) : null}
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={saving}
              onClick={() =>
                void (confirmKind === "status"
                  ? submitStatusChange()
                  : submitPaymentChange())
              }
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={saving}
              onClick={closeConfirm}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <section className="admin-panel">
        <h3 className="admin-panel__title">Order status timeline</h3>
        {order.history.length === 0 ? (
          <p className="admin-muted-text">No status history yet.</p>
        ) : (
          <ol className="admin-timeline">
            {order.history.map((entry) => (
              <li key={entry.id} className="admin-timeline__item">
                <div className="admin-timeline__meta">
                  {formatDateTime(entry.changedAt)}
                  {entry.changedBy ? ` · ${entry.changedBy}` : ""}
                </div>
                <div>
                  <span className={orderBadgeClass(entry.status)}>
                    {statusLabel(entry.status)}
                  </span>
                  {entry.fromStatus ? (
                    <span className="admin-muted-text">
                      {" "}
                      (from {statusLabel(entry.fromStatus)})
                    </span>
                  ) : null}
                </div>
                {entry.notes ? (
                  <div className="admin-muted-text">{entry.notes}</div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
