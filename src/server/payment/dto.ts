/** Payment gateway DTOs — provider-agnostic processing layer. */

import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

export type CreatePaymentInput = {
  orderId: string;
  method: CreateOrderPaymentDto["method"];
  /** Safe display only (e.g. Card ending in 4242). */
  safeDisplay?: string | null;
};

export type CreatePaymentResult = {
  paymentId: string;
  paymentUrl: string;
  status: "PENDING";
  method: CreateOrderPaymentDto["method"];
  methodLabel: string;
};

export type PaymentRecordDto = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  paymentUrl: string;
  method: CreateOrderPaymentDto["method"];
  methodLabel: string;
  safeDisplay: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentRequestDto = {
  orderId: string;
  method: CreateOrderPaymentDto["method"];
  safeDisplay?: string | null;
};

export type ConfirmPaymentRequestDto = {
  paymentId: string;
  result: "SUCCESS" | "FAILED";
};

export type ConfirmPaymentResponseDto = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  orderStatus:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "completed"
    | "cancelled"
    | "mock_placed";
};
