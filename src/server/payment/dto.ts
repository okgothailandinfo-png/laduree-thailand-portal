/** Payment gateway DTOs — provider-agnostic architecture layer. */

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
  status: "PENDING";
  redirectUrl: string;
};

export type PaymentRecordDto = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  redirectUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentRequestDto = {
  orderId: string;
};
