/** Maps gateway payment status ↔ domain order status. */

import type { OrderStatus } from "@/src/server/models/order";
import type { PaymentStatus } from "@/src/server/payment/dto";

export function orderStatusFromPaymentResult(
  result: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
): OrderStatus | null {
  if (result === "SUCCESS") return "confirmed";
  return null;
}

export function toApiOrderStatus(
  status: OrderStatus,
): "pending" | "confirmed" | "mock_placed" {
  return status;
}
