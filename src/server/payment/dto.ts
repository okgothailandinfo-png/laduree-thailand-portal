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
  /** Added by PaymentService for customer order access. */
  accessToken?: string;
  orderNumber?: string | null;
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
  /** Present after SUCCESS — capability token for confirmation/pickup/history. */
  accessToken?: string | null;
  /** Customer-facing order number (draft before pay; final after SUCCESS). */
  orderNumber?: string | null;
  /** Order total in THB major units for payment review UI. */
  totalThb?: number | null;
};

export type CreatePaymentRequestDto = {
  orderId: string;
  method: CreateOrderPaymentDto["method"];
  safeDisplay?: string | null;
  /**
   * Capability token issued at checkout. Required to create/reopen payment
   * (prevents IDOR minting via orderId alone).
   */
  accessToken: string;
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
  /** Capability token for post-payment customer routes (SUCCESS only). */
  accessToken: string | null;
  /** Final customer-facing order number after promotion (SUCCESS). */
  orderNumber: string | null;
};
