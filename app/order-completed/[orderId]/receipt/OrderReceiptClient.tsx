"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatPriceThb } from "@/lib/api/catalog";
import { fetchOrderCompletion } from "@/lib/api/orders";
import { rememberCustomerOrderId } from "@/lib/customer-orders";
import CatalogStatus from "../../../catalog/CatalogStatus";
import { useAsyncResource } from "../../../catalog/useAsyncResource";
import { formatPickupDateKeyLong } from "../../../pickup/pickup-dates";
import {
  formatDateTimeBangkok,
  formatModifierLine,
} from "../../format";
import "../../order-completed.css";

export default function OrderReceiptClient({
  orderId,
}: {
  orderId: string;
}) {
  const query = useAsyncResource(
    (signal) => fetchOrderCompletion(orderId, { signal }),
    {
      deps: [orderId],
    },
  );

  useEffect(() => {
    if (query.status === "success" && query.data) {
      rememberCustomerOrderId(query.data.orderId);
    }
  }, [query.status, query.data]);

  const showLoadState =
    query.status === "loading" ||
    query.status === "error" ||
    query.status === "empty";

  function handlePrint() {
    window.print();
  }

  return (
    <main className="order-receipt-page">
      <div className="order-receipt-page__inner">
        <div className="order-receipt-toolbar no-print">
          <Link
            href={`/order-completed/${encodeURIComponent(orderId)}`}
            className="order-completed-btn order-completed-btn--secondary"
          >
            ← Back
          </Link>
          <button
            type="button"
            className="order-completed-btn order-completed-btn--secondary"
            onClick={handlePrint}
            disabled={query.status !== "success"}
          >
            Print
          </button>
          <button
            type="button"
            className="order-completed-btn order-completed-btn--primary"
            onClick={handlePrint}
            disabled={query.status !== "success"}
          >
            Download as PDF
          </button>
        </div>

        {showLoadState ? (
          <CatalogStatus
            status={query.status === "loading" ? "loading" : "error"}
            errorMessage={
              query.errorMessage ??
              (query.status === "empty" ? "Receipt not found." : null)
            }
            onRetry={
              query.status === "error" || query.status === "empty"
                ? query.reload
                : undefined
            }
          />
        ) : null}

        {query.status === "success" && query.data ? (
          <article className="order-receipt-sheet" aria-label="Digital receipt">
            {/* eslint-disable-next-line @next/next/no-img-element -- print-friendly static logo */}
            <img
              src={query.data.receipt.logoUrl}
              alt="Ladurée"
              className="order-receipt-sheet__logo"
            />
            <p className="order-receipt-sheet__brand">Ladurée Thailand</p>
            <p className="order-receipt-sheet__subtitle">Receipt</p>

            <p className="order-receipt-sheet__meta">
              Order number: {query.data.receipt.orderNumber}
              <br />
              Boutique: {query.data.receipt.boutique.name}
              <br />
              {query.data.receipt.boutique.address}
            </p>

            <table className="order-receipt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {query.data.receipt.items.map((item, index) => {
                  const modifiers = formatModifierLine(item.modifiers);
                  return (
                    <tr key={`${item.productId}-${index}`}>
                      <td>
                        {item.name}
                        {modifiers ? (
                          <span className="order-receipt-table__modifiers">
                            {modifiers}
                          </span>
                        ) : null}
                      </td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">
                        {formatPriceThb(item.unitPriceThb)}
                      </td>
                      <td className="num">
                        {formatPriceThb(item.lineTotalThb)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="order-receipt-total">
              <span>Total</span>
              <span>{formatPriceThb(query.data.receipt.totalThb)}</span>
            </div>

            <p className="order-receipt-footer">
              Pickup time:{" "}
              {formatPickupDateKeyLong(query.data.receipt.pickupDateKey)} —{" "}
              {query.data.receipt.pickupTimeSlotLabel}
              <br />
              Pickup completed:{" "}
              {formatDateTimeBangkok(query.data.receipt.completedAt)}
            </p>
          </article>
        ) : null}
      </div>
    </main>
  );
}
