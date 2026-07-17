/**
 * In-process smoke checks for mock payment webhook verification & sync.
 * Run: DATA_SOURCE=mock MOCK_PAYMENT_WEBHOOK_SECRET=dev-secret npx tsx src/server/payment/webhook/run-webhook-smoke.ts
 */

import { randomUUID } from "crypto";
import { env } from "@/src/server/config/env";
import { PaymentService } from "@/src/server/payment/payment-service";
import { signMockWebhookPayload } from "@/src/server/payment/webhook/verify";
import { createRepositories } from "@/src/server/repositories/create-repositories";
import { AppError } from "@/src/server/utils/errors";

type Check = { name: string; ok: boolean; detail?: string };

async function main() {
  process.env.MOCK_PAYMENT_WEBHOOK_SECRET ||= "dev-webhook-secret";
  process.env.DATA_SOURCE ||= "mock";

  const secret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  const repos = createRepositories();
  const paymentService = new PaymentService(
    repos.orders,
    repos.payments,
    repos.webhookEvents,
    secret,
    env.mockPaymentWebhookToleranceSeconds || 300,
  );

  const orderId = randomUUID();
  await repos.orders.create({
    id: orderId,
    orderNumber: `SMOKE-${Date.now()}`,
    status: "pending",
    currency: "THB",
    createdAt: new Date().toISOString(),
    items: [],
    totalMinor: 0,
    termsAccepted: true,
    customer: {
      customerName: "Smoke Test",
      mobileNumber: "+66812345678",
      email: "smoke@example.com",
    },
    pickup: {
      boutiqueId: "boutique-pending",
      boutiqueName: "Boutique",
      address: "Bangkok",
      dateKey: "2026-07-17",
      timeSlotId: "1000-1030",
      timeSlotLabel: "10:00–10:30",
    },
  });

  const created = await paymentService.createPayment(orderId);
  const checks: Check[] = [];

  async function send(
    type: string,
    opts?: { badSig?: boolean; oldTs?: boolean; eventId?: string },
  ) {
    const eventId = opts?.eventId ?? randomUUID();
    const timestamp = opts?.oldTs
      ? Math.floor(Date.now() / 1000) - 10_000
      : Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      eventId,
      type,
      paymentId: created.paymentId,
      timestamp,
    });
    const signature = opts?.badSig
      ? `t=${timestamp},v1=${"00".repeat(32)}`
      : signMockWebhookPayload(body, secret, timestamp);
    return paymentService.handleMockWebhook({
      rawBody: body,
      signatureHeader: signature,
      parsedBody: JSON.parse(body),
    });
  }

  // pending
  const pending = await send("payment.pending");
  checks.push({
    name: "valid pending event",
    ok: pending.paymentStatus === "PENDING" && pending.orderStatus === "pending",
  });

  // success
  const success = await send("payment.succeeded");
  const orderAfterSuccess = await repos.orders.findById(orderId);
  checks.push({
    name: "valid success event",
    ok:
      success.paymentStatus === "SUCCESS" &&
      success.orderStatus === "confirmed" &&
      orderAfterSuccess?.status === "confirmed",
  });

  // duplicate success
  const dupEventId = randomUUID();
  await send("payment.succeeded", { eventId: dupEventId });
  // Reset payment to pending via a new payment for remaining tests
  const order2 = randomUUID();
  await repos.orders.create({
    id: order2,
    orderNumber: `SMOKE2-${Date.now()}`,
    status: "pending",
    currency: "THB",
    createdAt: new Date().toISOString(),
    items: [],
    totalMinor: 0,
    termsAccepted: true,
    customer: {
      customerName: "Smoke Test 2",
      mobileNumber: "+66812345679",
      email: "smoke2@example.com",
    },
    pickup: {
      boutiqueId: "boutique-pending",
      boutiqueName: "Boutique",
      address: "Bangkok",
      dateKey: "2026-07-17",
      timeSlotId: "1000-1030",
      timeSlotLabel: "10:00–10:30",
    },
  });
  const pay2 = await paymentService.createPayment(order2);

  async function sendFor(
    paymentId: string,
    type: string,
    opts?: { badSig?: boolean; oldTs?: boolean; eventId?: string },
  ) {
    const eventId = opts?.eventId ?? randomUUID();
    const timestamp = opts?.oldTs
      ? Math.floor(Date.now() / 1000) - 10_000
      : Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      eventId,
      type,
      paymentId,
      timestamp,
    });
    const signature = opts?.badSig
      ? `t=${timestamp},v1=${"00".repeat(32)}`
      : signMockWebhookPayload(body, secret, timestamp);
    return paymentService.handleMockWebhook({
      rawBody: body,
      signatureHeader: signature,
      parsedBody: JSON.parse(body),
    });
  }

  const failed = await sendFor(pay2.paymentId, "payment.failed");
  const orderAfterFail = await repos.orders.findById(order2);
  checks.push({
    name: "valid failed event",
    ok:
      failed.paymentStatus === "FAILED" &&
      orderAfterFail?.status === "pending",
  });

  const order3 = randomUUID();
  await repos.orders.create({
    id: order3,
    orderNumber: `SMOKE3-${Date.now()}`,
    status: "pending",
    currency: "THB",
    createdAt: new Date().toISOString(),
    items: [],
    totalMinor: 0,
    termsAccepted: true,
    customer: {
      customerName: "Smoke Test 3",
      mobileNumber: "+66812345670",
      email: "smoke3@example.com",
    },
    pickup: {
      boutiqueId: "boutique-pending",
      boutiqueName: "Boutique",
      address: "Bangkok",
      dateKey: "2026-07-17",
      timeSlotId: "1000-1030",
      timeSlotLabel: "10:00–10:30",
    },
  });
  const pay3 = await paymentService.createPayment(order3);
  const cancelled = await sendFor(pay3.paymentId, "payment.cancelled");
  const orderAfterCancel = await repos.orders.findById(order3);
  checks.push({
    name: "valid cancelled event",
    ok:
      cancelled.paymentStatus === "CANCELLED" &&
      orderAfterCancel?.status === "cancelled",
  });

  const order4 = randomUUID();
  await repos.orders.create({
    id: order4,
    orderNumber: `SMOKE4-${Date.now()}`,
    status: "pending",
    currency: "THB",
    createdAt: new Date().toISOString(),
    items: [],
    totalMinor: 0,
    termsAccepted: true,
    customer: {
      customerName: "Smoke Test 4",
      mobileNumber: "+66812345671",
      email: "smoke4@example.com",
    },
    pickup: {
      boutiqueId: "boutique-pending",
      boutiqueName: "Boutique",
      address: "Bangkok",
      dateKey: "2026-07-17",
      timeSlotId: "1000-1030",
      timeSlotLabel: "10:00–10:30",
    },
  });
  const pay4 = await paymentService.createPayment(order4);
  await sendFor(pay4.paymentId, "payment.succeeded");
  const refunded = await sendFor(pay4.paymentId, "payment.refunded");
  const orderAfterRefund = await repos.orders.findById(order4);
  checks.push({
    name: "valid refunded event",
    ok:
      refunded.paymentStatus === "REFUNDED" &&
      orderAfterRefund?.status === "confirmed",
  });

  let badSigOk = false;
  try {
    await sendFor(pay4.paymentId, "payment.pending", { badSig: true });
  } catch (error) {
    badSigOk = error instanceof AppError && error.code === "VALIDATION_ERROR";
  }
  checks.push({ name: "invalid signature rejected", ok: badSigOk });

  let oldTsOk = false;
  try {
    await sendFor(pay4.paymentId, "payment.pending", { oldTs: true });
  } catch (error) {
    oldTsOk = error instanceof AppError && error.code === "VALIDATION_ERROR";
  }
  checks.push({ name: "expired timestamp rejected", ok: oldTsOk });

  const eventId = randomUUID();
  const first = await send("payment.succeeded", { eventId });
  const second = await send("payment.succeeded", { eventId });
  checks.push({
    name: "duplicate event is idempotent",
    ok: first.duplicate === false && second.duplicate === true,
  });

  let notFoundOk = false;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      eventId: randomUUID(),
      type: "payment.succeeded",
      paymentId: randomUUID(),
      timestamp,
    });
    await paymentService.handleMockWebhook({
      rawBody: body,
      signatureHeader: signMockWebhookPayload(body, secret, timestamp),
      parsedBody: JSON.parse(body),
    });
  } catch (error) {
    notFoundOk = error instanceof AppError && error.code === "NOT_FOUND";
  }
  checks.push({ name: "unknown payment returns not found", ok: notFoundOk });

  const unrelated = await repos.orders.findById(order2);
  checks.push({
    name: "unrelated orders unchanged",
    ok: unrelated?.status === "pending",
  });

  checks.push({
    name: "payment success confirms correct order",
    ok: (await repos.orders.findById(orderId))?.status === "confirmed",
  });

  const failedChecks = checks.filter((item) => !item.ok);
  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"} — ${item.name}`);
  }
  if (failedChecks.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
