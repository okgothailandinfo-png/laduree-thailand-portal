import type { PaymentStatus } from "@/src/server/payment/dto";
import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

export type Payment = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  paymentUrl: string;
  method: CreateOrderPaymentDto["method"];
  methodLabel: string;
  /** Safe display only — never store PAN/CVV. */
  safeDisplay: string | null;
  createdAt: string;
  updatedAt: string;
};
