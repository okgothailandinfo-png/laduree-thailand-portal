/** Payment gateway DTOs — provider-agnostic processing layer. */

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type CreatePaymentInput = {
  orderId: string;
};

export type CreatePaymentResult = {
  paymentId: string;
  paymentUrl: string;
  status: "PENDING";
};

export type PaymentRecordDto = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  paymentUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentRequestDto = {
  orderId: string;
};

export type ConfirmPaymentRequestDto = {
  paymentId: string;
  result: "SUCCESS" | "FAILED";
};

export type ConfirmPaymentResponseDto = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  orderStatus: "pending" | "confirmed" | "cancelled" | "mock_placed";
};
