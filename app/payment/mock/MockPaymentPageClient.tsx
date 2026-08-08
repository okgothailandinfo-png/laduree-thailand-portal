"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderById } from "@/lib/api/orders";
import { cancelPayment, confirmPayment, fetchPayment } from "@/lib/api/payment";
import type { OrderDetail, PaymentRecord, PaymentStatus } from "@/lib/api/types";
import {
  formatMockCountdown,
  mockPaymentRemainingMs,
} from "@/lib/payment/mock-config";
import {
  canAccessOrderConfirmation,
  paymentUiStateFromGateway,
  type PaymentUiState,
} from "@/lib/payment/payment-ui-state";
import CatalogStatus from "../../catalog/CatalogStatus";
import { useOrderFlow } from "../../order/OrderFlowContext";
import "../payment.css";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

const TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
]);

function resolveUiState(
  payment: PaymentRecord | null,
  remainingMs: number,
): PaymentUiState {
  if (!payment) return "PROCESSING";
  if (payment.status === "PENDING" && remainingMs <= 0) return "EXPIRED";
  return paymentUiStateFromGateway(payment.status);
}

export default function MockPaymentPageClient({
  paymentId,
}: {
  paymentId: string | null;
}) {
  const router = useRouter();
  const { placeMockOrder } = useOrderFlow();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    paymentId ? "loading" : "error",
  );
  const [uiState, setUiState] = useState<PaymentUiState>("PROCESSING");
  const [error, setError] = useState<string | null>(
    paymentId ? null : "Missing paymentId.",
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const redirected = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!paymentId) return;
    const id = paymentId;

    let cancelled = false;
    const controller = new AbortController();

    async function loadOnce() {
      try {
        const data = await fetchPayment(id, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setPayment(data);
        const remaining = mockPaymentRemainingMs(data.createdAt);
        setRemainingMs(remaining);
        setUiState(resolveUiState(data, remaining));
        setError(null);
        setPhase("ready");

        try {
          const orderData = await fetchOrderById(data.orderId, {
            signal: controller.signal,
          });
          if (!cancelled) setOrder(orderData);
        } catch {
          // Order details are supplemental for mock screen totals.
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(errorMessage(err, "Unable to load payment."));
        setPhase("error");
      }
    }

    void loadOnce();

    const interval = window.setInterval(() => {
      if (cancelled) return;
      void fetchPayment(id, { signal: controller.signal })
        .then((data) => {
          if (cancelled) return;
          setPayment(data);
          const remaining = mockPaymentRemainingMs(data.createdAt);
          setRemainingMs(remaining);
          setUiState(resolveUiState(data, remaining));
          setError(null);
          if (TERMINAL.has(data.status) || remaining <= 0) {
            window.clearInterval(interval);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(errorMessage(err, "Unable to refresh payment status."));
        });
    }, 2000);

    const tick = window.setInterval(() => {
      if (cancelled || !paymentId) return;
      setPayment((current) => {
        if (!current || current.status !== "PENDING") return current;
        const remaining = mockPaymentRemainingMs(current.createdAt);
        setRemainingMs(remaining);
        if (remaining <= 0) {
          setUiState("EXPIRED");
        }
        return current;
      });
    }, 1000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
      window.clearInterval(tick);
    };
  }, [paymentId, reloadKey]);

  useEffect(() => {
    if (!payment || payment.status !== "SUCCESS" || redirected.current) return;
    if (!canAccessOrderConfirmation("SUCCEEDED")) return;
    redirected.current = true;
    placeMockOrder(payment.method, {
      safeDisplay: payment.safeDisplay,
      orderNumber: order?.orderNumber,
    });
    router.push(
      `/order-confirmation?orderId=${encodeURIComponent(payment.orderId)}`,
    );
  }, [payment, order?.orderNumber, placeMockOrder, router]);

  async function runConfirm(result: "SUCCESS" | "FAILED"): Promise<void> {
    if (!paymentId || actionBusy) return;
    if (payment && payment.status !== "PENDING") return;
    if (uiState === "EXPIRED") return;
    setActionBusy(true);
    setError(null);
    setUiState("PROCESSING");
    try {
      const confirmed = await confirmPayment({ paymentId, result });
      setPayment((current) =>
        current
          ? {
              ...current,
              status: confirmed.status,
              paymentId: confirmed.paymentId,
              orderId: confirmed.orderId,
              updatedAt: new Date().toISOString(),
            }
          : current,
      );
      setUiState(paymentUiStateFromGateway(confirmed.status));
    } catch (err: unknown) {
      setError(
        errorMessage(err, "Unable to confirm payment. Please try again."),
      );
      setUiState("FAILED");
      setPhase("error");
    } finally {
      setActionBusy(false);
    }
  }

  async function runCancel(): Promise<void> {
    if (!paymentId || actionBusy) return;
    if (payment && payment.status !== "PENDING") return;
    setActionBusy(true);
    setError(null);
    try {
      const cancelled = await cancelPayment(paymentId);
      setPayment((current) =>
        current
          ? {
              ...current,
              status: cancelled.status,
              updatedAt: new Date().toISOString(),
            }
          : current,
      );
      setUiState("CANCELLED");
      router.push(
        `/payment?orderId=${encodeURIComponent(cancelled.orderId)}`,
      );
    } catch (err: unknown) {
      setError(
        errorMessage(err, "Unable to cancel payment. Please try again."),
      );
      setPhase("error");
    } finally {
      setActionBusy(false);
    }
  }

  function retry() {
    setReloadKey((value) => value + 1);
    setPhase(paymentId ? "loading" : "error");
    setError(paymentId ? null : "Missing paymentId.");
    redirected.current = false;
  }

  const isPromptPay = payment?.method === "promptpay-qr";
  const isCard = payment?.method === "credit-card";
  const pendingActions =
    payment?.status === "PENDING" && uiState !== "EXPIRED" && !actionBusy;

  return (
    <main className="payment-page">
      <div className="payment-page__inner">
        <div className="payment-page__top">
          <Link
            href={
              payment
                ? `/payment?orderId=${encodeURIComponent(payment.orderId)}`
                : "/payment"
            }
            className="payment-page__back"
          >
            ← Back
          </Link>
        </div>

        <h1 className="payment-page__title">Payment</h1>

        {!paymentId ? (
          <div className="payment-gate" role="alert">
            Complete checkout information before payment.{" "}
            <Link href="/checkout">Checkout</Link>
          </div>
        ) : null}

        {paymentId && phase === "loading" ? (
          <CatalogStatus status="loading" />
        ) : null}

        {paymentId && phase === "error" ? (
          <CatalogStatus
            status="error"
            errorMessage={error ?? "Unable to load payment."}
            onRetry={retry}
          />
        ) : null}

        {paymentId && payment && phase === "ready" ? (
          <section
            className="payment-card"
            aria-labelledby="mock-payment-title"
            data-testid="mock-authorization"
          >
            <h2 id="mock-payment-title" className="payment-card__title">
              Mock Authorization
            </h2>
            <p className="payment-note" data-testid="mock-payment-disclaimer">
              Mock payment only — no real payment gateway, charge, or QR is
              processed.
            </p>

            <p className="payment-summary-meta">
              Payment Method: {payment.methodLabel}
              <br />
              Order Number:{" "}
              <span data-testid="mock-order-number">
                {order?.orderNumber ?? "—"}
              </span>
              <br />
              Total payable:{" "}
              <span data-testid="mock-total-payable">
                {formatPriceThb(order?.totalThb ?? null)}
              </span>
            </p>

            <p
              className="payment-summary-meta"
              role="status"
              data-testid="mock-payment-status"
            >
              Payment status: {uiState}
            </p>

            {payment.status === "PENDING" ? (
              <p
                className="payment-summary-meta"
                data-testid="mock-payment-expiry"
              >
                Expires in {formatMockCountdown(remainingMs)} (mock window)
              </p>
            ) : null}

            {isPromptPay ? (
              <div
                className="payment-qr-placeholder"
                data-testid="promptpay-mock-qr"
              >
                <div
                  className="payment-qr-box"
                  role="img"
                  aria-label="Mock PromptPay QR placeholder"
                />
                <p>
                  Mock PromptPay QR — not a real QR code.
                  <br />
                  No bank account, phone number, or PromptPay ID is encoded.
                </p>
              </div>
            ) : null}

            {isCard ? (
              <div
                className="payment-panel"
                data-testid="credit-card-mock-auth"
              >
                <p className="payment-note">
                  Mock card authorization — no real charge.
                </p>
                {payment.safeDisplay ? (
                  <p className="payment-summary-meta">{payment.safeDisplay}</p>
                ) : null}
              </div>
            ) : null}

            {uiState === "FAILED" ? (
              <p className="payment-note" role="alert">
                Payment failed. You can retry or change payment method.
              </p>
            ) : null}
            {uiState === "CANCELLED" ? (
              <p className="payment-note" role="status">
                Payment cancelled.
              </p>
            ) : null}
            {uiState === "EXPIRED" ? (
              <p className="payment-note" role="alert">
                Payment expired. Return to Payment to try again.
              </p>
            ) : null}
            {uiState === "SUCCEEDED" ? (
              <p className="payment-note" role="status">
                Payment succeeded. Redirecting to confirmation…
              </p>
            ) : null}

            {actionBusy ? (
              <div className="payment-submit-status">
                <CatalogStatus status="loading" />
              </div>
            ) : null}

            {error && phase === "ready" ? (
              <p className="field-validation-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="payment-mock-actions">
              <button
                type="button"
                className="payment-submit"
                disabled={!pendingActions}
                data-testid="simulate-success"
                onClick={() => void runConfirm("SUCCESS")}
              >
                Simulate Success
              </button>
              <button
                type="button"
                className="payment-submit payment-submit--secondary"
                disabled={!pendingActions}
                data-testid="simulate-failure"
                onClick={() => void runConfirm("FAILED")}
              >
                Simulate Failure
              </button>
              <button
                type="button"
                className="payment-submit payment-submit--secondary"
                disabled={!pendingActions}
                data-testid="cancel-payment"
                onClick={() => void runCancel()}
              >
                Cancel Payment
              </button>
            </div>

            {(uiState === "FAILED" || uiState === "EXPIRED") && payment ? (
              <p className="payment-summary-meta">
                <Link
                  href={`/payment?orderId=${encodeURIComponent(payment.orderId)}`}
                >
                  Return to Payment
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
