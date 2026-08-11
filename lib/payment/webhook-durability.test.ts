import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "crypto";
import {
  isPrismaUniqueViolation,
  isWebhookClaimStale,
  WEBHOOK_CLAIM_STALE_MS,
} from "@/src/server/payment/webhook-claim";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";
import { PaymentService } from "@/src/server/payment/payment-service";
import { issueOrderAccessToken } from "@/src/server/orders/order-access-token";
import { signMockWebhookPayload } from "@/src/server/payment/webhook/verify";
import type { Order } from "@/src/server/models/order";
import { AppError } from "@/src/server/utils/errors";

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
        unitPriceMinor: 129_000,
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
      boutiqueId: "b1",
      boutiqueName: "Ladurée Thailand",
      address: "Bangkok",
      dateKey: "2026-08-11",
      timeSlotId: "1000",
      timeSlotLabel: "10:00 To 10:30",
    },
    ...overrides,
  };
}

describe("Sprint 32 — webhook claim helpers", () => {
  it("detects stale PROCESSING claims", () => {
    const fresh = new Date().toISOString();
    const stale = new Date(Date.now() - WEBHOOK_CLAIM_STALE_MS - 1).toISOString();
    assert.equal(isWebhookClaimStale(fresh), false);
    assert.equal(isWebhookClaimStale(stale), true);
  });

  it("detects Prisma unique violations", () => {
    assert.equal(isPrismaUniqueViolation({ code: "P2002" }), true);
    assert.equal(isPrismaUniqueViolation({ code: "P2003" }), false);
    assert.equal(isPrismaUniqueViolation(null), false);
  });
});

describe("Sprint 32 — webhook durability (mock)", () => {
  it("releases claim after apply failure so retry can succeed", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const webhooks = new MockWebhookEventRepository();
    const secret = "test-webhook-secret-sprint32";
    const service = new PaymentService(
      orders,
      payments,
      webhooks,
      secret,
      300,
    );

    const order = draftOrder();
    await orders.create(order);
    const token = issueOrderAccessToken(order.id);
    const created = await service.createPayment({
      orderId: order.id,
      method: "credit-card",
      accessToken: token,
    });

    const eventId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const missingPaymentBody = JSON.stringify({
      eventId,
      type: "payment.succeeded",
      paymentId: randomUUID(),
      timestamp,
    });

    await assert.rejects(
      () =>
        service.handleMockWebhook({
          rawBody: missingPaymentBody,
          signatureHeader: signMockWebhookPayload(
            missingPaymentBody,
            secret,
            timestamp,
          ),
          parsedBody: JSON.parse(missingPaymentBody),
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "NOT_FOUND",
    );

    assert.equal(await webhooks.hasProcessed(eventId), false);

    const successBody = JSON.stringify({
      eventId,
      type: "payment.succeeded",
      paymentId: created.paymentId,
      timestamp,
    });
    const result = await service.handleMockWebhook({
      rawBody: successBody,
      signatureHeader: signMockWebhookPayload(successBody, secret, timestamp),
      parsedBody: JSON.parse(successBody),
    });
    assert.equal(result.duplicate, false);
    assert.equal(result.paymentStatus, "SUCCESS");
    assert.equal(await webhooks.hasProcessed(eventId), true);

    const retry = await service.handleMockWebhook({
      rawBody: successBody,
      signatureHeader: signMockWebhookPayload(successBody, secret, timestamp),
      parsedBody: JSON.parse(successBody),
    });
    assert.equal(retry.duplicate, true);
  });

  it("marks durable PROCESSED only after successful apply", async () => {
    const orders = new MockOrderRepository();
    const payments = new MockPaymentRepository();
    const webhooks = new MockWebhookEventRepository();
    const secret = "test-webhook-secret-sprint32";
    const service = new PaymentService(
      orders,
      payments,
      webhooks,
      secret,
      300,
    );

    const order = draftOrder();
    await orders.create(order);
    const created = await service.createPayment({
      orderId: order.id,
      method: "promptpay-qr",
      accessToken: issueOrderAccessToken(order.id),
    });

    const eventId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      eventId,
      type: "payment.succeeded",
      paymentId: created.paymentId,
      timestamp,
    });

    const first = await service.handleMockWebhook({
      rawBody: body,
      signatureHeader: signMockWebhookPayload(body, secret, timestamp),
      parsedBody: JSON.parse(body),
    });
    assert.equal(first.duplicate, false);
    assert.equal(await webhooks.hasProcessed(eventId), true);

    const second = await service.handleMockWebhook({
      rawBody: body,
      signatureHeader: signMockWebhookPayload(body, secret, timestamp),
      parsedBody: JSON.parse(body),
    });
    assert.equal(second.duplicate, true);
  });
});
