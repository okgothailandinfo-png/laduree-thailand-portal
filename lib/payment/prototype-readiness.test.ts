import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { randomUUID } from "crypto";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";
import { PaymentService } from "@/src/server/payment/payment-service";
import { issueOrderAccessToken } from "@/src/server/orders/order-access-token";
import type { Order } from "@/src/server/models/order";
import { MOCK_PAYMENT_EXPIRY_MS } from "@/lib/payment/mock-config";
import { MOCK_PAYMENT_MODE_NOTICE } from "@/lib/payment/mock-mode-notice";
import { isPrototypeEnvironment } from "@/src/server/config/env";

function createWebhookRepo(): MockWebhookEventRepository {
  return new MockWebhookEventRepository();
}

function draftOrder(overrides?: Partial<Order>): Order {
  return {
    id: randomUUID(),
    orderNumber: `DRAFT-${Date.now()}`,
    status: "pending",
    serviceType: "PICKUP",
    currency: "THB",
    createdAt: new Date().toISOString(),
    items: [
      {
        productId: "p1",
        name: "Macaron",
        quantity: 2,
        modifiers: [{ groupId: "g1", optionId: "o1", name: "Rose" }],
        unitPriceMinor: 99000,
      },
    ],
    totalMinor: 198000,
    termsAccepted: true,
    customer: {
      customerName: "Ada Lovelace",
      mobileNumber: "+66812345678",
      email: "ada@example.com",
    },
    pickup: {
      boutiqueId: "b1",
      boutiqueName: "Ladurée Thailand",
      address: "Bangkok",
      dateKey: "2026-08-10",
      timeSlotId: "1000",
      timeSlotLabel: "10:00 To 10:30",
    },
    ...overrides,
  };
}

function createService() {
  const orders = new MockOrderRepository();
  const payments = new MockPaymentRepository();
  const service = new PaymentService(
    orders,
    payments,
    createWebhookRepo(),
    "test-secret",
    300,
  );
  return { orders, payments, service };
}

describe("Sprint 27 — prototype/staging readiness", () => {
  it("treats current non-production env as prototype-capable", () => {
    assert.equal(isPrototypeEnvironment(), true);
  });

  it("supports success, failure, cancel, idempotent confirm, and reopen paid order", async () => {
    const { orders, service } = createService();
    const order = draftOrder();
    await orders.create(order);
    const token = issueOrderAccessToken(order.id);

    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: token,
    });

    const failed = await service.confirmPayment(
      created.paymentId,
      "FAILED",
      token,
    );
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.orderStatus, "pending");

    // New pending payment after failure (create reuses only PENDING same method).
    const retryCreate = await service.createPayment({
      orderId: order.id,
      method: "credit-card",
      safeDisplay: "Card ending in 4242",
      accessToken: token,
    });
    assert.notEqual(retryCreate.paymentId, created.paymentId);

    const cancelled = await service.cancelPayment(retryCreate.paymentId, token);
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal((await orders.findById(order.id))?.status, "pending");

    const third = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: token,
    });
    const firstSuccess = await service.confirmPayment(
      third.paymentId,
      "SUCCESS",
      token,
    );
    assert.equal(firstSuccess.status, "SUCCESS");
    assert.equal(firstSuccess.orderStatus, "confirmed");

    const duplicateSuccess = await service.confirmPayment(
      third.paymentId,
      "SUCCESS",
      token,
    );
    assert.equal(duplicateSuccess.status, "SUCCESS");
    assert.equal(duplicateSuccess.orderNumber, firstSuccess.orderNumber);

    await assert.rejects(
      () =>
        service.createPayment({
          orderId: order.id,
          method: "promptpay-qr",
          accessToken: token,
        }),
      /already paid/i,
    );

    const reopened = await service.getPayment(third.paymentId, token);
    assert.equal(reopened.status, "SUCCESS");
    assert.equal(reopened.orderNumber, firstSuccess.orderNumber);
    assert.equal(reopened.totalThb, 1980);
  });

  it("expires pending mock payments server-side after the mock window", async () => {
    const { orders, payments, service } = createService();
    const order = draftOrder();
    await orders.create(order);
    const token = issueOrderAccessToken(order.id);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: token,
    });

    const record = await payments.findById(created.paymentId);
    assert.ok(record);
    const staleCreatedAt = new Date(
      Date.now() - MOCK_PAYMENT_EXPIRY_MS - 1_000,
    ).toISOString();
    await payments.save({
      ...record,
      createdAt: staleCreatedAt,
      updatedAt: staleCreatedAt,
    });

    const fetched = await service.getPayment(created.paymentId, token);
    assert.equal(fetched.status, "EXPIRED");

    await assert.rejects(
      () => service.confirmPayment(created.paymentId, "SUCCESS", token),
      /Only pending payments can be confirmed/i,
    );
  });

  it("denies cross-order payment access without revealing payment existence", async () => {
    const { orders, service } = createService();
    const orderA = draftOrder();
    const orderB = draftOrder();
    await orders.create(orderA);
    await orders.create(orderB);
    const tokenA = issueOrderAccessToken(orderA.id);
    const tokenB = issueOrderAccessToken(orderB.id);

    const created = await service.createPayment({
      orderId: orderA.id,
      method: "credit-card",
      safeDisplay: "Card ending in 1111",
      accessToken: tokenA,
    });

    await assert.rejects(
      () => service.getPayment(created.paymentId, tokenB),
      /Invalid order access token/i,
    );
    await assert.rejects(
      () => service.getPayment(randomUUID(), tokenA),
      /Invalid order access token/i,
    );
  });

  it("preserves pickup journey fields through payment enrichment", async () => {
    const { orders, service } = createService();
    const order = draftOrder();
    await orders.create(order);
    const token = issueOrderAccessToken(order.id);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: token,
    });
    await service.confirmPayment(created.paymentId, "SUCCESS", token);
    const after = await orders.findById(order.id);
    assert.ok(after);
    assert.equal(after.pickup?.boutiqueId, "b1");
    assert.equal(after.pickup?.dateKey, "2026-08-10");
    assert.equal(after.pickup?.timeSlotId, "1000");
    assert.equal(after.customer.email, "ada@example.com");
    assert.equal(after.items[0]?.quantity, 2);
    assert.equal(after.items[0]?.modifiers[0]?.name, "Rose");
    assert.equal(after.totalMinor, 198000);
    assert.equal(after.payment?.status, "mock_accepted");
    assert.match(after.orderNumber, /^LD-TH-[0-9A-Z]{8}$/);
  });

  it("clears source cart after durable payment SUCCESS (idempotent)", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const cleared: string[] = [];
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
      undefined,
      undefined,
      undefined,
      async (cartId) => {
        cleared.push(cartId);
      },
    );
    const order = draftOrder({ sourceCartId: "cart-source-1" });
    await orders.create(order);
    const token = issueOrderAccessToken(order.id);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: token,
    });
    await service.confirmPayment(created.paymentId, "SUCCESS", token);
    assert.deepEqual(cleared, ["cart-source-1"]);

    // Idempotent SUCCESS confirm returns durable state without re-running sync.
    await service.confirmPayment(created.paymentId, "SUCCESS", token);
    assert.deepEqual(cleared, ["cart-source-1"]);
  });

  it("marks mock UI surfaces and recovery links for prototype mode", () => {
    const mockPage = readFileSync(
      path.join(process.cwd(), "app/payment/mock/MockPaymentPageClient.tsx"),
      "utf8",
    );
    assert.match(mockPage, /paymentReturnHref/);
    assert.match(mockPage, /token=\$\{encodeURIComponent/);
    assert.match(mockPage, /isAccessTokenError/);

    const confirmation = readFileSync(
      path.join(
        process.cwd(),
        "app/order-confirmation/OrderConfirmationClient.tsx",
      ),
      "utf8",
    );
    assert.match(confirmation, /isMockPaymentMode/);
    assert.match(confirmation, /MockPaymentModeNotice/);
    assert.match(confirmation, /Succeeded \(mock\)/);

    const receipt = readFileSync(
      path.join(
        process.cwd(),
        "app/order-completed/[orderId]/receipt/OrderReceiptClient.tsx",
      ),
      "utf8",
    );
    assert.match(receipt, /isMockPaymentMode/);
    assert.match(receipt, /MockPaymentModeNotice/);

    assert.match(MOCK_PAYMENT_MODE_NOTICE, /Mock payment only/);
    assert.match(MOCK_PAYMENT_MODE_NOTICE, /no real charge/i);
  });

  it("documents staging as the prototype/staging APP_ENV and keeps mock default", () => {
    const envExample = readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf8",
    );
    assert.match(envExample, /APP_ENV=development/);
    assert.match(envExample, /PAYMENT_PROVIDER=mock/);
    assert.match(envExample, /prototype\/staging/i);
    assert.match(envExample, /APP_ENV=staging/);
    assert.doesNotMatch(envExample, /omise|2c2p|stripe|paypal/i);

    const guard = readFileSync(
      path.join(process.cwd(), "src/server/payment/production-guard.ts"),
      "utf8",
    );
    assert.match(guard, /PAYMENT_PROVIDER=mock/);

    const historyRoute = readFileSync(
      path.join(process.cwd(), "app/api/orders/history/route.ts"),
      "utf8",
    );
    assert.match(historyRoute, /assertRateLimit/);
    assert.match(historyRoute, /orders-history/);

    const deprecatedPayment = readFileSync(
      path.join(process.cwd(), "app/api/payment/route.ts"),
      "utf8",
    );
    assert.match(deprecatedPayment, /assertRateLimit/);
    assert.match(deprecatedPayment, /readIdempotencyKey/);
  });
});
