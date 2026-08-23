import type { Payment } from "@/src/server/models/payment";
import type {
  PaymentRepository,
  SavePendingExclusiveResult,
} from "@/src/server/repositories/payment.repository";
import {
  readPreviewCommerceSnapshot,
  writePreviewPaymentCookie,
} from "@/src/server/preview/preview-commerce-cookie";

/**
 * Restores the preview mock payment when the in-memory isolate is empty.
 */
export class PreviewCookiePaymentRepository implements PaymentRepository {
  constructor(private readonly inner: PaymentRepository) {}

  private async restore(): Promise<Payment | null> {
    const snapshot = await readPreviewCommerceSnapshot();
    const payment = snapshot?.payment ?? null;
    if (!payment) return null;
    return this.inner.save(payment);
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const existing = await this.inner.findById(paymentId);
    if (existing) return existing;
    const restored = await this.restore();
    if (!restored || restored.paymentId !== paymentId) return null;
    return restored;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const existing = await this.inner.findByOrderId(orderId);
    if (existing) return existing;
    const restored = await this.restore();
    if (!restored || restored.orderId !== orderId) return null;
    return restored;
  }

  async findPendingByOrderId(orderId: string): Promise<Payment | null> {
    const existing = await this.inner.findPendingByOrderId(orderId);
    if (existing) return existing;
    const restored = await this.restore();
    if (
      !restored ||
      restored.orderId !== orderId ||
      restored.status !== "PENDING"
    ) {
      return null;
    }
    return restored;
  }

  async save(payment: Payment): Promise<Payment> {
    const saved = await this.inner.save(payment);
    await writePreviewPaymentCookie(saved);
    return saved;
  }

  async savePendingExclusive(
    payment: Payment,
  ): Promise<SavePendingExclusiveResult> {
    const result = await this.inner.savePendingExclusive(payment);
    await writePreviewPaymentCookie(result.payment);
    return result;
  }
}
