import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";
import { PaymentService } from "@/src/server/payment/payment-service";
import { issueOrderAccessToken } from "@/src/server/orders/order-access-token";
import type { Order } from "@/src/server/models/order";
import { randomUUID } from "crypto";

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
        quantity: 1,
        modifiers: [],
        unitPriceMinor: 129000,
      },
    ],
    totalMinor: 129000,
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

describe("Sprint 24 payment experience", () => {
  it("creates mock payment for Credit Card and PromptPay only", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);

    const card = await service.createPayment({
      orderId: order.id,
      method: "credit-card",
      safeDisplay: "Card ending in 4242",
      accessToken: issueOrderAccessToken(order.id),
    });
    assert.equal(card.method, "credit-card");
    assert.equal(card.methodLabel, "Credit Card");
    assert.match(card.paymentUrl, /\/payment\/mock\?paymentId=/);

    const attached = await orders.findById(order.id);
    assert.equal(attached?.payment?.method, "credit-card");
    assert.equal(attached?.payment?.status, "pending");
    assert.equal(attached?.payment?.safeDisplay, "Card ending in 4242");
  });

  it("rejects apple-pay and google-pay methods", () => {
    const service = new PaymentService(
      new MockOrderRepository(),
      new MockPaymentRepository(),
      createWebhookRepo(),
      "test-secret",
      300,
    );
    assert.throws(() =>
      service.parseCreatePaymentBody({
        orderId: "x",
        method: "apple-pay",
      }),
    );
    assert.throws(() =>
      service.parseCreatePaymentBody({
        orderId: "x",
        method: "google-pay",
      }),
    );
  });

  it("rejects safeDisplay that looks like a full card number", () => {
    const service = new PaymentService(
      new MockOrderRepository(),
      new MockPaymentRepository(),
      createWebhookRepo(),
      "test-secret",
      300,
    );
    assert.throws(() =>
      service.parseCreatePaymentBody({
        orderId: "x",
        method: "credit-card",
        safeDisplay: "4242424242424242",
      }),
    );
  });

  it("reuses pending payment for the same method (duplicate create)", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);

    const first = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });
    const second = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });
    assert.equal(first.paymentId, second.paymentId);
  });

  it("payment create route supports idempotency key header", () => {
    const route = readFileSync(
      path.join(process.cwd(), "app/api/payment/create/route.ts"),
      "utf8",
    );
    assert.match(route, /Idempotency-Key|idempotencyKey|readIdempotencyKey/);
    assert.match(route, /saveIdempotentResponse/);
  });

  it("simulate success confirms order; failure keeps unpaid", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });

    const failed = await service.confirmPayment(created.paymentId, "FAILED", issueOrderAccessToken(order.id));
    assert.equal(failed.status, "FAILED");
    assert.equal(failed.orderStatus, "pending");
    const afterFail = await orders.findById(order.id);
    assert.equal(afterFail?.status, "pending");
    assert.equal(afterFail?.payment?.status, "failed");
  });

  it("cancelled payment does not confirm the order", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "credit-card",
      safeDisplay: "Card ending in 4242",
      accessToken: issueOrderAccessToken(order.id),
    });
    await service.cancelPayment(created.paymentId, issueOrderAccessToken(order.id));
    const after = await orders.findById(order.id);
    assert.equal(after?.status, "pending");
    assert.notEqual(after?.payment?.status, "mock_accepted");
  });

  it("success finalizes payment and confirms order", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });
    const ok = await service.confirmPayment(created.paymentId, "SUCCESS", issueOrderAccessToken(order.id));
    assert.equal(ok.status, "SUCCESS");
    assert.equal(ok.orderStatus, "confirmed");
    assert.ok(ok.accessToken);
    assert.ok(ok.orderNumber);
    assert.equal(ok.orderNumber.startsWith("DRAFT-"), false);
    assert.match(ok.orderNumber, /^LD-TH-[0-9A-Z]{8}$/);
    const after = await orders.findById(order.id);
    assert.equal(after?.status, "confirmed");
    assert.equal(after?.payment?.status, "mock_accepted");
    assert.equal(after?.payment?.methodLabel, "PromptPay QR");
    assert.equal(after?.orderNumber, ok.orderNumber);
    assert.match(after?.orderNumber ?? "", /^LD-TH-[0-9A-Z]{8}$/);
  });

  it("refresh of unpaid order does not mark paid (order stays pending)", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "credit-card",
      safeDisplay: "Card ending in 1111",
      accessToken: issueOrderAccessToken(order.id),
    });
    const fetched = await service.getPayment(created.paymentId, issueOrderAccessToken(order.id));
    assert.equal(fetched.status, "PENDING");
    const still = await orders.findById(order.id);
    assert.equal(still?.status, "pending");
    assert.equal(still?.payment?.status, "pending");
  });

  it("already paid orders reject another create", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "credit-card",
      safeDisplay: "Card ending in 4242",
      accessToken: issueOrderAccessToken(order.id),
    });
    await service.confirmPayment(created.paymentId, "SUCCESS", issueOrderAccessToken(order.id));
    await assert.rejects(
      () =>
        service.createPayment({
          orderId: order.id,
          method: "promptpay-qr",
          accessToken: issueOrderAccessToken(order.id),
        }),
      /already paid/i,
    );
  });

  it("refuses payment create/get without a valid order access token", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-secret",
      300,
    );
    const order = draftOrder();
    await orders.create(order);

    assert.throws(() =>
      service.parseCreatePaymentBody({
        orderId: order.id,
        method: "credit-card",
      }),
    );

    await assert.rejects(
      () =>
        service.createPayment({
          orderId: order.id,
          method: "credit-card",
          accessToken: "not-a-valid-token",
        }),
      /access token/i,
    );

    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });
    await assert.rejects(
      () => service.getPayment(created.paymentId, "not-a-valid-token"),
      /access token/i,
    );
  });

  it("UI and source exclude Apple Pay and Google Pay", () => {
    const paymentPage = readFileSync(
      path.join(process.cwd(), "app/payment/PaymentPageClient.tsx"),
      "utf8",
    );
    assert.equal(paymentPage.includes("apple-pay"), false);
    assert.equal(paymentPage.includes("google-pay"), false);
    assert.equal(paymentPage.includes("Apple Pay"), false);
    assert.equal(paymentPage.includes("Google Pay"), false);
    assert.match(paymentPage, /credit-card/);
    assert.match(paymentPage, /promptpay-qr/);
    assert.match(paymentPage, /Place Order/);
    assert.match(paymentPage, /data-testid="place-order"/);
  });

  it("mock authorization screen is clearly marked mock", () => {
    const mockPage = readFileSync(
      path.join(process.cwd(), "app/payment/mock/MockPaymentPageClient.tsx"),
      "utf8",
    );
    assert.match(mockPage, /Mock payment only/);
    assert.match(mockPage, /Simulate Success/);
    assert.match(mockPage, /Simulate Failure/);
    assert.match(mockPage, /Cancel Payment/);
    assert.match(mockPage, /promptpay-mock-qr/);
    assert.match(mockPage, /not a real QR/);
  });

  it("does not persist or log card secrets in payment client", () => {
    const paymentPage = readFileSync(
      path.join(process.cwd(), "app/payment/PaymentPageClient.tsx"),
      "utf8",
    );
    assert.equal(paymentPage.includes("localStorage"), false);
    assert.equal(paymentPage.includes("sessionStorage"), false);
    assert.equal(/console\.(log|info|debug).*card/i.test(paymentPage), false);
    assert.match(paymentPage, /safeCardDisplayFromNumber/);
    assert.match(paymentPage, /setCard\(emptyCard\)/);
  });

  it("confirmation requires succeeded payment gate", () => {
    const confirmation = readFileSync(
      path.join(process.cwd(), "app/order-confirmation/OrderConfirmationClient.tsx"),
      "utf8",
    );
    assert.match(confirmation, /isConfirmationAllowed/);
    assert.match(confirmation, /confirmation-payment-required/);
    assert.match(confirmation, /confirmation-token-required/);
    assert.match(confirmation, /PickupCredentialsCard/);
    assert.match(confirmation, /delivery-order-tracking/);
    assert.match(confirmation, /Payment successful!/);
    assert.match(confirmation, /Your order is good to go!/);
    assert.match(confirmation, /View Payment Receipt/);
    // Sprint 28 — legacy no-orderId confirmation path is gated.
    assert.match(
      confirmation,
      /confirmation requires a tokenized server order/i,
    );
  });

  it("Sprint 28 payment page recovers from server order without live cart", () => {
    const paymentPage = readFileSync(
      path.join(process.cwd(), "app/payment/PaymentPageClient.tsx"),
      "utf8",
    );
    assert.match(paymentPage, /isRecoverableUnpaidOrder/);
    assert.match(paymentPage, /buildOrderReviewFromOrderDetail/);
    assert.match(paymentPage, /canContinuePayment/);
    assert.match(paymentPage, /customerSafePaymentError/);
    assert.match(paymentPage, /Order already paid/);

    const history = readFileSync(
      path.join(process.cwd(), "app/order-history/OrderHistoryClient.tsx"),
      "utf8",
    );
    assert.match(history, /listRememberedOrders/);
    assert.match(history, /historyItemNeedsPaymentRecovery/);
    assert.doesNotMatch(history, /listMockMemberOrders/);
  });
});
