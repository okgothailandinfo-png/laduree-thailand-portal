"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { confirmPayment, fetchPayment } from "@/lib/api/payment";
import type { PaymentRecord, PaymentStatus } from "@/lib/api/types";
import CatalogStatus from "../../catalog/CatalogStatus";
import "../payment.css";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

type UiPhase =
  | "loading"
  | "processing"
  | "success"
  | "failed"
  | "cancelled"
  | "error";

const TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);

function phaseFromPayment(status: PaymentStatus): UiPhase {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED" || status === "REFUNDED") return "cancelled";
  return "processing";
}

export default function MockPaymentPageClient({
  paymentId,
}: {
  paymentId: string | null;
}) {
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [phase, setPhase] = useState<UiPhase>(paymentId ? "loading" : "error");
  const [error, setError] = useState<string | null>(
    paymentId ? null : "Missing paymentId.",
  );
  const [actionBusy, setActionBusy] = useState(false);
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
        setPhase(phaseFromPayment(data.status));
        setError(null);
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
          setPhase(phaseFromPayment(data.status));
          setError(null);
          if (TERMINAL.has(data.status)) {
            window.clearInterval(interval);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(errorMessage(err, "Unable to refresh payment status."));
        });
    }, 2000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [paymentId, reloadKey]);

  useEffect(() => {
    if (!payment || payment.status !== "SUCCESS" || redirected.current) return;
    redirected.current = true;
    router.push(
      `/order-confirmation?orderId=${encodeURIComponent(payment.orderId)}`,
    );
  }, [payment, router]);

  async function runConfirm(result: "SUCCESS" | "FAILED"): Promise<void> {
    if (!paymentId || actionBusy) return;
    setActionBusy(true);
    setError(null);
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
      setPhase(phaseFromPayment(confirmed.status));
    } catch (err: unknown) {
      setError(
        errorMessage(err, "Unable to confirm payment. Please try again."),
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

  return (
    <main className="payment-page">
      <div className="payment-page__inner">
        <div className="payment-page__top">
          <Link href="/payment" className="payment-page__back">
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

        {paymentId && payment && phase !== "loading" && phase !== "error" ? (
          <section className="payment-card" aria-labelledby="mock-payment-title">
            <h2 id="mock-payment-title" className="payment-card__title">
              Payment Method
            </h2>
            <p className="payment-note">
              Thailand payment methods — placeholder UI only. No real payment
              gateway, charge, or QR is processed. [CONTENT PENDING APPROVAL]
            </p>
            <p className="payment-summary-meta" role="status">
              Status: {payment.status}
            </p>

            {phase === "processing" ? (
              <p className="payment-note" role="status">
                Processing
              </p>
            ) : null}
            {phase === "success" ? (
              <p className="payment-note" role="status">
                Success
              </p>
            ) : null}
            {phase === "failed" ? (
              <p className="payment-note" role="alert">
                Failed
              </p>
            ) : null}
            {phase === "cancelled" ? (
              <p className="payment-note" role="status">
                Cancelled
              </p>
            ) : null}

            {actionBusy ? (
              <div className="payment-submit-status">
                <CatalogStatus status="loading" />
              </div>
            ) : null}

            <div className="payment-mock-actions">
              <button
                type="button"
                className="payment-submit"
                disabled={actionBusy || payment.status !== "PENDING"}
                onClick={() => void runConfirm("SUCCESS")}
              >
                Success
              </button>
              <button
                type="button"
                className="payment-submit payment-submit--secondary"
                disabled={actionBusy || payment.status !== "PENDING"}
                onClick={() => void runConfirm("FAILED")}
              >
                Fail
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
