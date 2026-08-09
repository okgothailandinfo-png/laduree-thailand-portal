"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { formatPriceThb } from "@/lib/api/catalog";
import { cancelPayment, confirmPayment, fetchPayment } from "@/lib/api/payment";
import type { PaymentRecord, PaymentStatus } from "@/lib/api/types";
import {
  getRememberedOrderAccessToken,
  rememberCustomerOrder,
} from "@/lib/customer-orders";
import {
  formatMockCountdown,
  mockPaymentRemainingMs,
} from "@/lib/payment/mock-config";
import {
  canAccessOrderConfirmation,
  paymentUiStateFromGateway,
  type PaymentUiState,
} from "@/lib/payment/payment-ui-state";
import { buildOrderConfirmationPath } from "@/lib/orders/post-payment-session";
import CatalogStatus from "../../catalog/CatalogStatus";
import { useCart } from "../../cart/CartContext";
import { useCheckout } from "../../checkout/CheckoutContext";
import { useOrderFlow } from "../../order/OrderFlowContext";
import { usePickup } from "../../pickup/PickupContext";
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
  accessToken: accessTokenProp,
}: {
  paymentId: string | null;
  accessToken: string | null;
}) {
  const router = useRouter();
  const { placeMockOrder } = useOrderFlow();
  const { clearItems } = useCart();
  const { resetSelection } = usePickup();
  const { resetCheckoutSession } = useCheckout();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
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
  const sessionCleared = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [resolvedToken, setResolvedToken] = useState<string | null>(
    () => accessTokenProp?.trim() || null,
  );

  function resolveToken(orderId?: string | null): string | null {
    const fromProp = accessTokenProp?.trim() || resolvedToken?.trim() || null;
    if (fromProp) return fromProp;
    if (orderId) return getRememberedOrderAccessToken(orderId);
    return null;
  }

  const loadToken =
    accessTokenProp?.trim() ||
    resolvedToken?.trim() ||
    (payment?.orderId
      ? getRememberedOrderAccessToken(payment.orderId)
      : null);
  const missingAccessToken = Boolean(paymentId) && !loadToken;

  useEffect(() => {
    if (!paymentId || !loadToken) return;
    const id = paymentId;
    const token = loadToken;

    let cancelled = false;
    const controller = new AbortController();

    async function loadOnce() {
      try {
        const data = await fetchPayment(id, {
          signal: controller.signal,
          accessToken: token,
        });
        if (cancelled) return;
        setPayment(data);
        if (data.accessToken) {
          setResolvedToken(data.accessToken);
          rememberCustomerOrder({
            orderId: data.orderId,
            accessToken: data.accessToken,
            orderNumber: data.orderNumber,
          });
        }
        const remaining = mockPaymentRemainingMs(data.createdAt);
        setRemainingMs(remaining);
        setUiState(resolveUiState(data, remaining));
        setError(null);
        setPhase("ready");
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
      void fetchPayment(id, { signal: controller.signal, accessToken: token })
        .then((data) => {
          if (cancelled) return;
          setPayment(data);
          if (data.accessToken) {
            setResolvedToken(data.accessToken);
          }
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
  }, [paymentId, reloadKey, loadToken]);

  useEffect(() => {
    if (!payment || payment.status !== "SUCCESS" || redirected.current) return;
    if (!canAccessOrderConfirmation("SUCCEEDED")) return;
    const accessToken = payment.accessToken?.trim();
    if (!accessToken) return;

    redirected.current = true;
    const orderNumber = payment.orderNumber ?? undefined;
    rememberCustomerOrder({
      orderId: payment.orderId,
      accessToken,
      orderNumber,
    });
    placeMockOrder(payment.method, {
      safeDisplay: payment.safeDisplay,
      orderNumber,
    });

    void (async () => {
      if (!sessionCleared.current) {
        sessionCleared.current = true;
        try {
          await clearItems();
        } catch {
          // Cart clear is best-effort after durable payment success.
        }
        resetSelection();
        resetCheckoutSession();
      }
      router.push(
        buildOrderConfirmationPath({
          orderId: payment.orderId,
          accessToken,
        }),
      );
    })();
  }, [
    payment,
    placeMockOrder,
    router,
    clearItems,
    resetSelection,
    resetCheckoutSession,
  ]);

  async function runConfirm(result: "SUCCESS" | "FAILED"): Promise<void> {
    if (!paymentId || actionBusy) return;
    if (payment && payment.status !== "PENDING") return;
    if (uiState === "EXPIRED") return;
    const token = resolveToken(payment?.orderId);
    if (!token) {
      setError(
        "Order access token is required. Return to checkout to continue payment.",
      );
      return;
    }
    setActionBusy(true);
    setError(null);
    setUiState("PROCESSING");
    try {
      const confirmed = await confirmPayment(
        { paymentId, result },
        { accessToken: token },
      );
      setPayment((current) =>
        current
          ? {
              ...current,
              status: confirmed.status,
              paymentId: confirmed.paymentId,
              orderId: confirmed.orderId,
              updatedAt: new Date().toISOString(),
              accessToken: confirmed.accessToken,
              orderNumber: confirmed.orderNumber,
              totalThb: current.totalThb,
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
    const tokenForCancel = resolveToken(payment?.orderId);
    if (!tokenForCancel) {
      setError(
        "Order access token is required. Return to checkout to continue payment.",
      );
      return;
    }
    setActionBusy(true);
    setError(null);
    try {
      const cancelled = await cancelPayment(paymentId, {
        accessToken: tokenForCancel,
      });
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
      const token =
        cancelled.accessToken?.trim() ||
        getRememberedOrderAccessToken(cancelled.orderId);
      if (token) {
        rememberCustomerOrder({
          orderId: cancelled.orderId,
          accessToken: token,
          orderNumber: cancelled.orderNumber,
        });
      }
      const paymentReturn = token
        ? `/payment?orderId=${encodeURIComponent(cancelled.orderId)}&token=${encodeURIComponent(token)}`
        : `/payment?orderId=${encodeURIComponent(cancelled.orderId)}`;
      router.push(paymentReturn);
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

        {paymentId && !missingAccessToken && phase === "loading" ? (
          <CatalogStatus status="loading" />
        ) : null}

        {paymentId && (missingAccessToken || phase === "error") ? (
          <CatalogStatus
            status="error"
            errorMessage={
              missingAccessToken
                ? "Order access token is required. Return to checkout to continue payment."
                : (error ?? "Unable to load payment.")
            }
            onRetry={missingAccessToken ? undefined : retry}
          />
        ) : null}

        {paymentId && payment && phase === "ready" && !missingAccessToken ? (
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
                {payment.orderNumber ?? "—"}
              </span>
              <br />
              Total payable:{" "}
              <span data-testid="mock-total-payable">
                {formatPriceThb(
                  typeof payment.totalThb === "number" ? payment.totalThb : null,
                )}
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
