import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Payment } from "@/src/server/models/payment";
import {
  MockPaymentRepository,
  resetMockPayments,
} from "@/src/server/repositories/mock/payment.repository";

function pendingPayment(
  orderId: string,
  paymentId: string,
  method: Payment["method"] = "credit-card",
): Payment {
  const now = new Date().toISOString();
  return {
    paymentId,
    orderId,
    status: "PENDING",
    paymentUrl: `/payment/mock?paymentId=${paymentId}`,
    method,
    methodLabel: method === "credit-card" ? "Credit Card" : "PromptPay QR",
    safeDisplay: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Sprint 30 — MockPaymentRepository exclusive PENDING", () => {
  it("reuses the same PENDING payment under concurrent creates", async () => {
    resetMockPayments();
    const repo = new MockPaymentRepository();
    const orderId = "order-dual-pending";

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repo.savePendingExclusive(
          pendingPayment(orderId, `pay-${index}`, "promptpay-qr"),
        ),
      ),
    );

    const paymentIds = new Set(results.map((row) => row.payment.paymentId));
    assert.equal(paymentIds.size, 1);
    assert.equal(results.filter((row) => row.reused).length, 7);
    assert.equal(results.filter((row) => !row.reused).length, 1);

    const pending = await repo.findPendingByOrderId(orderId);
    assert.ok(pending);
    assert.equal(pending.status, "PENDING");
    assert.equal(pending.method, "promptpay-qr");
  });

  it("cancels a different-method PENDING before creating a new one", async () => {
    resetMockPayments();
    const repo = new MockPaymentRepository();
    const orderId = "order-method-switch";

    const first = await repo.savePendingExclusive(
      pendingPayment(orderId, "pay-a", "credit-card"),
    );
    assert.equal(first.reused, false);

    const second = await repo.savePendingExclusive(
      pendingPayment(orderId, "pay-b", "promptpay-qr"),
    );
    assert.equal(second.reused, false);
    assert.equal(second.payment.method, "promptpay-qr");

    const cancelled = await repo.findById("pay-a");
    assert.equal(cancelled?.status, "CANCELLED");
    const pending = await repo.findPendingByOrderId(orderId);
    assert.equal(pending?.paymentId, "pay-b");
  });

  it("Sprint 32 — keeps a single PENDING after interleaved method switches", async () => {
    resetMockPayments();
    const repo = new MockPaymentRepository();
    const orderId = "order-interleaved";

    await Promise.all([
      repo.savePendingExclusive(pendingPayment(orderId, "pay-cc-1", "credit-card")),
      repo.savePendingExclusive(
        pendingPayment(orderId, "pay-qr-1", "promptpay-qr"),
      ),
      repo.savePendingExclusive(pendingPayment(orderId, "pay-cc-2", "credit-card")),
      repo.savePendingExclusive(
        pendingPayment(orderId, "pay-qr-2", "promptpay-qr"),
      ),
    ]);

    const pending = await repo.findPendingByOrderId(orderId);
    assert.ok(pending);
    assert.equal(pending.status, "PENDING");

    const allStatuses = await Promise.all(
      ["pay-cc-1", "pay-qr-1", "pay-cc-2", "pay-qr-2"].map((id) =>
        repo.findById(id),
      ),
    );
    const pendingRows = allStatuses.filter((row) => row?.status === "PENDING");
    assert.equal(pendingRows.length, 1);
  });
});
