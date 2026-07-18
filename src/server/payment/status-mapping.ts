/** Maps gateway payment status ↔ domain order status. */

import type { OrderStatus } from "@/src/server/models/order";
import type { PaymentStatus } from "@/src/server/payment/dto";

export type ApiOrderStatus = OrderStatus;

/**
 * Returns the order status to apply for a payment status, or null when the
 * order should be left unchanged.
 *
 * - FAILED: PAYMENT_FAILED does not exist → leave order PENDING
 * - REFUNDED: payment-only; no fulfilment invention
 * - CANCELLED: domain/Prisma support CANCELLED when order is still pending
 */
export function orderStatusFromPaymentStatus(
  paymentStatus: PaymentStatus,
): OrderStatus | null {
  switch (paymentStatus) {
    case "PENDING":
      return null;
    case "SUCCESS":
      return "confirmed";
    case "FAILED":
      return null;
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return null;
    default: {
      const _exhaustive: never = paymentStatus;
      return _exhaustive;
    }
  }
}

export function orderStatusFromPaymentResult(
  result: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
): OrderStatus | null {
  return orderStatusFromPaymentStatus(result);
}

export function isSafeToCancelOrder(current: OrderStatus): boolean {
  return current === "pending";
}

/** Statuses past payment confirmation — payment sync must not demote these. */
const FULFILMENT_OR_TERMINAL: ReadonlySet<OrderStatus> = new Set([
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "mock_placed",
]);

/**
 * Whether payment-driven sync may apply `next` to the current order status.
 * Prevents demoting fulfilment / terminal states.
 */
export function canApplyPaymentOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
): boolean {
  if (current === next) return false;
  if (next === "confirmed" && FULFILMENT_OR_TERMINAL.has(current)) {
    return false;
  }
  if (next === "cancelled" && !isSafeToCancelOrder(current)) {
    return false;
  }
  return true;
}

export function toApiOrderStatus(status: OrderStatus): ApiOrderStatus {
  return status;
}
