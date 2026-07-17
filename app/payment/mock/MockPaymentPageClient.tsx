"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import {
  cancelPayment,
  fetchPayment,
  settleMockPaymentFail,
  settleMockPaymentSuccess,
} from "@/lib/api/payment";
import type { PaymentRecord } from "@/lib/api/types";
import CatalogStatus from "../../catalog/CatalogStatus";
import { useAsyncResource } from "../../catalog/useAsyncResource";
import "../payment.css";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function MockPaymentPageClient({
  paymentId,
}: {
  paymentId: string | null;
}) {
  const router = useRouter();
  const [actionStatus, setActionStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
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

  async function runAction(
    action: "success" | "fail" | "cancel",
  ): Promise<void> {
    if (!paymentId || isBusy) return;
    setActionStatus("loading");
    setActionError(null);

    try {
      let record: PaymentRecord;
      if (action === "success") {
        record = await settleMockPaymentSuccess(paymentId);
      } else if (action === "fail") {
        record = await settleMockPaymentFail(paymentId);
      } else {
        record = await cancelPayment(paymentId);
      }
      setLatest(record);
      setActionStatus("idle");

      if (action === "success") {
        router.push(
          `/order-confirmation?orderId=${encodeURIComponent(record.orderId)}`,
        );
      }
    } catch (error: unknown) {
      setActionStatus("error");
      setActionError(
        errorMessage(error, "Unable to update payment. Please try again."),
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

        {paymentId &&
        (paymentQuery.status === "loading" ||
          paymentQuery.status === "error" ||
          paymentQuery.status === "empty") &&
        !payment ? (
          <CatalogStatus
            status={paymentQuery.status === "loading" ? "loading" : "error"}
            errorMessage={
              paymentQuery.errorMessage ??
              (paymentQuery.status === "empty" ? "Payment not found." : null)
            }
            onRetry={
              paymentQuery.status === "error" || paymentQuery.status === "empty"
                ? paymentQuery.reload
                : undefined
            }
          />
        ) : null}

        {paymentId && payment ? (
          <section className="payment-card" aria-labelledby="mock-payment-title">
            <h2 id="mock-payment-title" className="payment-card__title">
              Payment Method
            </h2>
            <p className="payment-note">
              Thailand payment methods — placeholder UI only. No real payment
              gateway, charge, or QR is processed. [CONTENT PENDING APPROVAL]
            </p>
            <p className="payment-summary-meta">
              Status: {payment.status}
            </p>

            {actionStatus === "loading" || actionStatus === "error" ? (
              <div className="payment-submit-status">
                <CatalogStatus
                  status={actionStatus === "loading" ? "loading" : "error"}
                  errorMessage={actionError}
                  onRetry={
                    actionStatus === "error"
                      ? () => {
                          setActionStatus("idle");
                          setActionError(null);
                        }
                      : undefined
                  }
                />
              </div>
            ) : null}

            <div className="payment-mock-actions">
              <button
                type="button"
                className="payment-submit"
                disabled={isBusy || payment.status !== "PENDING"}
                onClick={() => void runAction("success")}
              >
                Success
              </button>
              <button
                type="button"
                className="payment-submit payment-submit--secondary"
                disabled={isBusy || payment.status !== "PENDING"}
                onClick={() => void runAction("fail")}
              >
                Fail
              </button>
              <button
                type="button"
                className="payment-submit payment-submit--secondary"
                disabled={
                  isBusy ||
                  payment.status === "CANCELLED" ||
                  payment.status === "REFUNDED"
                }
                onClick={() => void runAction("cancel")}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
