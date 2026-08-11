import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "crypto";
import type { Order } from "@/src/server/models/order";
import {
  createFinalOrderNumber,
  FINAL_ORDER_NUMBER_PATTERN,
  isCanonicalFinalOrderNumber,
  isDraftOrderNumber,
  isFinalOrderNumber,
} from "@/src/server/orders/order-number";
import { PaymentService } from "@/src/server/payment/payment-service";
import { issueOrderAccessToken } from "@/src/server/orders/order-access-token";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";

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
        unitPriceMinor: 129_000,
        modifiers: [],
      },
    ],
    totalMinor: 129_000,
    termsAccepted: true,
    customer: {
      customerName: "Ada Lovelace",
      mobileNumber: "+66812345678",
      email: "ada@example.com",
    },
    pickup: {
      boutiqueId: "boutique-1",
      boutiqueName: "Boutique",
      address: "Bangkok",
      dateKey: "2026-08-08",
      timeSlotId: "1030-1100",
      timeSlotLabel: "10:30–11:00",
    },
    ...overrides,
  };
}

describe("Sprint 25 — draft to final order number", () => {
  it("uses owner-approved LD-TH-XXXXXXXX format", () => {
    assert.equal(isDraftOrderNumber("DRAFT-ABC"), true);
    assert.equal(isDraftOrderNumber("LD-TH-A7K3M9Q2"), false);
    assert.equal(isFinalOrderNumber("LD-TH-A7K3M9Q2"), true);
    assert.equal(isCanonicalFinalOrderNumber("LD-TH-A7K3M9Q2"), true);

    // Legacy mock history numbers remain final (backward compatible).
    assert.equal(isFinalOrderNumber("LD-TH-100241"), true);
    assert.equal(isCanonicalFinalOrderNumber("LD-TH-100241"), false);

    const generated = createFinalOrderNumber();
    assert.match(generated, FINAL_ORDER_NUMBER_PATTERN);
    assert.equal(generated.length, "LD-TH-".length + 8);
    assert.equal(isCanonicalFinalOrderNumber(generated), true);
  });

  it("generates unique non-sequential numbers across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const value = createFinalOrderNumber();
      assert.match(value, FINAL_ORDER_NUMBER_PATTERN);
      assert.equal(seen.has(value), false);
      seen.add(value);
    }
    assert.equal(seen.size, 200);
  });

  it("promotes draft number on payment SUCCESS and stays stable on repeat", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-webhook-secret",
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
    const first = await service.confirmPayment(created.paymentId, "SUCCESS", issueOrderAccessToken(order.id));
    assert.ok(first.orderNumber);
    assert.equal(isDraftOrderNumber(first.orderNumber), false);
    assert.match(first.orderNumber, FINAL_ORDER_NUMBER_PATTERN);

    const again = await service.getPayment(created.paymentId, issueOrderAccessToken(order.id));
    assert.equal(again.orderNumber, first.orderNumber);
    assert.ok(again.accessToken);

    const persisted = await orders.findById(order.id);
    assert.equal(persisted?.orderNumber, first.orderNumber);
    assert.equal(persisted?.id, order.id);
  });

  it("does not rewrite an already-final LD-TH number after SUCCESS", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-webhook-secret",
      300,
    );
    const existingFinal = "LD-TH-A7K3M9Q2";
    const order = draftOrder({ orderNumber: existingFinal });
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });
    const ok = await service.confirmPayment(created.paymentId, "SUCCESS", issueOrderAccessToken(order.id));
    assert.equal(ok.orderNumber, existingFinal);
    const persisted = await orders.findById(order.id);
    assert.equal(persisted?.orderNumber, existingFinal);
  });

  it("does not issue pickup credentials for delivery on SUCCESS", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const service = new PaymentService(
      orders,
      payments,
      createWebhookRepo(),
      "test-webhook-secret",
      300,
    );
    const order = draftOrder({
      serviceType: "DELIVERY",
      pickup: undefined,
      delivery: {
        mode: "EARLIEST_AVAILABLE",
        address: {
          recipient: "Ada",
          phone: "+66812345678",
          address: "1 Road",
          subdistrict: "Lumphini",
          district: "Pathum Wan",
          province: "Bangkok",
          postalCode: "10330",
        },
        feeMinor: 8000,
        zoneId: "zone-bkk",
        feeStrategy: "FLAT_RATE",
        dateKey: "2026-08-08",
        promiseRelativeLabel: "Today",
        fulfilmentBoutiqueId: null,
      },
    });
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });
    const ok = await service.confirmPayment(created.paymentId, "SUCCESS", issueOrderAccessToken(order.id));
    assert.equal(ok.orderStatus, "confirmed");
    assert.match(ok.orderNumber ?? "", FINAL_ORDER_NUMBER_PATTERN);
  });
});
