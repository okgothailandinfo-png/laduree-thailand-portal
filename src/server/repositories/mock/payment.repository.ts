import type { Payment } from "@/src/server/models/payment";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";

const paymentsById = new Map<string, Payment>();
const paymentIdByOrderId = new Map<string, string>();

export class MockPaymentRepository implements PaymentRepository {
  async findById(paymentId: string): Promise<Payment | null> {
    const row = paymentsById.get(paymentId);
    return row ? { ...row } : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const paymentId = paymentIdByOrderId.get(orderId);
    if (!paymentId) return null;
    return this.findById(paymentId);
  }

  async save(payment: Payment): Promise<Payment> {
    const next: Payment = { ...payment };
    paymentsById.set(next.paymentId, next);
    paymentIdByOrderId.set(next.orderId, next.paymentId);
    return { ...next };
  }
}
