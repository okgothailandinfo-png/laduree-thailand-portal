import type { PaymentStatus } from "@/src/server/payment/dto";

export type MockPaymentWebhookEventType =
  | "payment.pending"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled"
  | "payment.refunded";

export type MockPaymentWebhookEventDto = {
  eventId: string;
  type: MockPaymentWebhookEventType;
  paymentId: string;
  /** Unix epoch seconds */
  timestamp: number;
};

export const MOCK_PAYMENT_WEBHOOK_EVENT_TYPES: readonly MockPaymentWebhookEventType[] =
  [
    "payment.pending",
    "payment.succeeded",
    "payment.failed",
    "payment.cancelled",
    "payment.refunded",
  ] as const;

export function paymentStatusFromWebhookEvent(
  type: MockPaymentWebhookEventType,
): PaymentStatus {
  switch (type) {
    case "payment.pending":
      return "PENDING";
    case "payment.succeeded":
      return "SUCCESS";
    case "payment.failed":
      return "FAILED";
    case "payment.cancelled":
      return "CANCELLED";
    case "payment.refunded":
      return "REFUNDED";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
