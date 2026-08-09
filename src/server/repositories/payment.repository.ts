import type { Payment } from "@/src/server/models/payment";

export type SavePendingExclusiveResult = {
  payment: Payment;
  /** True when an existing PENDING payment for the same order+method was reused. */
  reused: boolean;
};

export interface PaymentRepository {
  findById(paymentId: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  /** Latest PENDING payment for the order, if any. */
  findPendingByOrderId(orderId: string): Promise<Payment | null>;
  save(payment: Payment): Promise<Payment>;
  /**
   * Atomically create a PENDING payment or reuse an existing PENDING for the
   * same order + method. Cancels a different-method PENDING before creating.
   * Prevents concurrent dual-PENDING rows for one order in-process (mock) and
   * via transactional check (prisma).
   */
  savePendingExclusive(payment: Payment): Promise<SavePendingExclusiveResult>;
}
