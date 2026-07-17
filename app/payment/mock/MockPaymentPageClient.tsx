"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { confirmPayment, fetchPayment } from "@/lib/api/payment";
import type { PaymentRecord } from "@/lib/api/types";
import CatalogStatus from "../../catalog/CatalogStatus";
import { useAsyncResource } from "../../catalog/useAsyncResource";
import "../payment.css";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

type UiPhase = "loading" | "pending" | "success" | "failed" | "error";

export default function MockPaymentPageClient({
  paymentId,
}: {
  paymentId: string | null;
}) {
  const router = useRouter();
  const [actionStatus, setActionStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [latest, setLatest] = useState<PaymentRecord | null>(null);

  const paymentQuery = useAsyncResource(
    (signal) => {
      if (!paymentId) return Promise.resolve(null);
      return fetchPayment(paymentId, { signal });
    },
    {
      deps: [paymentId],
      isEmpty: (data) => data === null,
    },
  );

  const payment = latest ?? paymentQuery.data;
  const isBusy = actionStatus === "loading";

  const phase: UiPhase = (() => {
    if (!paymentId) return "error";
    if (paymentQuery.status === "loading" && !payment) return "loading";
    if (paymentQuery.status === "error" || paymentQuery.status === "empty") {
      return "error";
    }
    if (!payment) return "loading";
    if (payment.status === "SUCCESS") return "success";
    if (payment.status === "FAILED") return "failed";
    if (actionStatus === "error") return "error";
    return "pending";
  })();

  async function runConfirm(result: "SUCCESS" | "FAILED"): Promise<void> {
    if (!paymentId || isBusy) return;
    setActionStatus("loading");
    setActionError(null);

    try {
      const confirmed = await confirmPayment({ paymentId, result });
      setLatest({
        paymentId: confirmed.paymentId,
        orderId: confirmed.orderId,
        status: confirmed.status,
        paymentUrl: payment?.paymentUrl ?? "",
        createdAt: payment?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setActionStatus("idle");

      if (result === "SUCCESS") {
        router.push(
          `/order-confirmation?orderId=${encodeURIComponent(confirmed.orderId)}`,
        );
      }
    } catch (error: unknown) {
      setActionStatus("error");
      setActionError(
        errorMessage(error, "Unable to confirm payment. Please try again."),
      );
    }
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
            errorMessage={
              actionError ??
              paymentQuery.errorMessage ??
              "Unable to load payment."
            }
            onRetry={() => {
              setActionStatus("idle");
              setActionError(null);
              paymentQuery.reload();
            }}
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

            {phase === "pending" ? (
              <p className="payment-note" role="status">
                Pending
              </p>
            ) : null}

            {phase === "failed" ? (
              <p className="payment-note" role="alert">
                Failed
              </p>
            ) : null}

            {phase === "success" ? (
              <p className="payment-note" role="status">
                Success
              </p>
            ) : null}

            {actionStatus === "loading" ? (
              <div className="payment-submit-status">
                <CatalogStatus status="loading" />
              </div>
            ) : null}

            <div className="payment-mock-actions">
              <button
                type="button"
                className="payment-submit"
                disabled={isBusy || payment.status !== "PENDING"}
                onClick={() => void runConfirm("SUCCESS")}
              >
                Success
              </button>
              <button
                type="button"
                className="payment-submit payment-submit--secondary"
                disabled={isBusy || payment.status !== "PENDING"}
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
