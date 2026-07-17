import type { Payment } from "@/src/server/models/payment";

export interface PaymentRepository {
  findById(paymentId: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  save(payment: Payment): Promise<Payment>;
}
