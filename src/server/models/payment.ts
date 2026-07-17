import type { PaymentStatus } from "@/src/server/payment/dto";

export type Payment = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  paymentUrl: string;
  createdAt: string;
  updatedAt: string;
};
