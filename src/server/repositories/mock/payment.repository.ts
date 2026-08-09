import type { Payment } from "@/src/server/models/payment";
import type {
  PaymentRepository,
  SavePendingExclusiveResult,
} from "@/src/server/repositories/payment.repository";

const paymentsById = new Map<string, Payment>();
/** Tracks the latest payment id per order (any status). */
const paymentIdByOrderId = new Map<string, string>();
/** Serializes exclusive PENDING creates per order (in-process). */
const orderLocks = new Map<string, Promise<void>>();

async function withOrderLock<T>(
  orderId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = orderLocks.get(orderId) ?? Promise.resolve();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => held);
  orderLocks.set(orderId, chained);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
  }
}

function findPendingSync(orderId: string): Payment | null {
  let pending: Payment | null = null;
  for (const payment of paymentsById.values()) {
    if (payment.orderId === orderId && payment.status === "PENDING") {
      if (!pending || payment.createdAt > pending.createdAt) {
        pending = payment;
      }
    }
  }
  return pending ? { ...pending } : null;
}

export class MockPaymentRepository implements PaymentRepository {
  async findById(paymentId: string): Promise<Payment | null> {
    const row = paymentsById.get(paymentId);
    return row ? { ...row } : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const pending = findPendingSync(orderId);
    if (pending) return pending;
    const paymentId = paymentIdByOrderId.get(orderId);
    if (!paymentId) return null;
    return this.findById(paymentId);
  }

  async findPendingByOrderId(orderId: string): Promise<Payment | null> {
    return findPendingSync(orderId);
  }

  async save(payment: Payment): Promise<Payment> {
    const next: Payment = { ...payment };
    paymentsById.set(next.paymentId, next);
    paymentIdByOrderId.set(next.orderId, next.paymentId);
    return { ...next };
  }

  async savePendingExclusive(
    payment: Payment,
  ): Promise<SavePendingExclusiveResult> {
    return withOrderLock(payment.orderId, async () => {
      const existing = findPendingSync(payment.orderId);
      if (existing) {
        if (existing.method === payment.method) {
          return { payment: existing, reused: true };
        }
        paymentsById.set(existing.paymentId, {
          ...existing,
          status: "CANCELLED",
          updatedAt: new Date().toISOString(),
        });
      }
      const next: Payment = { ...payment, status: "PENDING" };
      paymentsById.set(next.paymentId, next);
      paymentIdByOrderId.set(next.orderId, next.paymentId);
      return { payment: { ...next }, reused: false };
    });
  }
}

/** Test helper — clears in-memory payment maps between suites when needed. */
export function resetMockPayments(): void {
  paymentsById.clear();
  paymentIdByOrderId.clear();
  orderLocks.clear();
}
