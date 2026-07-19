/**
 * In-process smoke checks for notification center (mock queue + providers).
 * Run: DATA_SOURCE=mock npx tsx src/server/notifications/smoke/run-notification-smoke.ts
 */

import { randomUUID } from "node:crypto";
import type { Order } from "@/src/server/models/order";
import { createNotificationProviders } from "@/src/server/notifications/factory";
import { maskEmail } from "@/src/server/notifications/masking";
import { NotificationOrchestrator } from "@/src/server/notifications/orchestrator";
import { NotificationQueueService } from "@/src/server/notifications/queue.service";
import { NotificationSettingsService } from "@/src/server/notifications/settings.service";
import { DefaultNotificationTemplateService } from "@/src/server/notifications/template.service";
import {
  MockNotificationQueueRepository,
  MockNotificationSettingRepository,
} from "@/src/server/repositories/mock/notification.repository";

type Check = { name: string; ok: boolean; detail?: string };

function sampleOrder(overrides?: {
  id?: string;
  orderNumber?: string;
  status?: Order["status"];
  email?: string;
}): Order {
  return {
    id: overrides?.id ?? randomUUID(),
    orderNumber: overrides?.orderNumber ?? `NTF-${Date.now()}`,
    status: overrides?.status ?? "confirmed",
    currency: "THB",
    createdAt: new Date().toISOString(),
    items: [],
    totalMinor: 129000,
    termsAccepted: true,
    customer: {
      customerName: "Smoke Customer",
      mobileNumber: "+66812345678",
      email: overrides?.email ?? "customer@example.com",
    },
    pickup: {
      boutiqueId: "boutique-1",
      boutiqueName: "Central Embassy",
      address: "Bangkok",
      dateKey: "2026-07-20",
      timeSlotId: "1000-1030",
      timeSlotLabel: "10:00–10:30",
    },
  };
}

function createStack(options?: { forceFailure?: boolean }) {
  const queueRepo = new MockNotificationQueueRepository();
  const settingsRepo = new MockNotificationSettingRepository();
  const templates = new DefaultNotificationTemplateService();
  const settings = new NotificationSettingsService(settingsRepo);
  const queue = new NotificationQueueService(
    queueRepo,
    templates,
    createNotificationProviders({
      mockForceFailure: options?.forceFailure ?? false,
    }),
    3,
    20,
  );
  const orchestrator = new NotificationOrchestrator(
    queue,
    settings,
    "http://localhost:3000",
  );
  return { queueRepo, settings, queue, orchestrator };
}

async function main() {
  process.env.DATA_SOURCE ||= "mock";
  const checks: Check[] = [];

  const happy = createStack();

  const order1 = sampleOrder({ status: "confirmed" });
  happy.queueRepo.setOrderNumber(order1.id, order1.orderNumber);
  const r1 = await happy.orchestrator.onOrderConfirmed(order1);
  const emailJobs1 = r1?.jobs.filter((j) => j.job.channel === "EMAIL") ?? [];
  checks.push({
    name: "ORDER_CONFIRMED enqueues email job",
    ok: emailJobs1.length === 1 && emailJobs1[0].job.status === "PENDING",
    detail: `jobs=${r1?.jobs.length ?? 0} status=${emailJobs1[0]?.job.status}`,
  });

  const r1b = await happy.orchestrator.onOrderConfirmed(order1);
  checks.push({
    name: "Duplicate ORDER_CONFIRMED does not create duplicate job",
    ok: r1b?.jobs[0]?.created === false,
    detail: `created=${String(r1b?.jobs[0]?.created)}`,
  });

  const orderReady = sampleOrder({
    id: randomUUID(),
    status: "ready_for_pickup",
    orderNumber: `NTF-READY-${Date.now()}`,
  });
  const rReady = await happy.orchestrator.onOrderReadyForPickup(orderReady);
  checks.push({
    name: "ORDER_READY_FOR_PICKUP enqueues email job",
    ok:
      (rReady?.jobs.filter((j) => j.job.channel === "EMAIL").length ?? 0) === 1,
  });

  const orderCancel = sampleOrder({
    id: randomUUID(),
    status: "cancelled",
    orderNumber: `NTF-CXL-${Date.now()}`,
  });
  const rCancel = await happy.orchestrator.onOrderCancelled(orderCancel);
  checks.push({
    name: "ORDER_CANCELLED enqueues email job",
    ok:
      (rCancel?.jobs.filter((j) => j.job.channel === "EMAIL").length ?? 0) === 1,
  });

  const orderDone = sampleOrder({
    id: randomUUID(),
    status: "completed",
    orderNumber: `NTF-DONE-${Date.now()}`,
  });
  const rDone = await happy.orchestrator.onPickupCompleted(orderDone);
  checks.push({
    name: "PICKUP_COMPLETED enqueues email job",
    ok: (rDone?.jobs.filter((j) => j.job.channel === "EMAIL").length ?? 0) === 1,
  });

  const orderPayFail = sampleOrder({
    id: randomUUID(),
    status: "pending",
    orderNumber: `NTF-PAY-${Date.now()}`,
  });
  const rPayFail = await happy.orchestrator.onPaymentFailed(orderPayFail);
  checks.push({
    name: "PAYMENT_FAILED enqueues email job",
    ok:
      (rPayFail?.jobs.filter((j) => j.job.channel === "EMAIL").length ?? 0) === 1,
  });

  const orderNoEmail = sampleOrder({
    id: randomUUID(),
    status: "confirmed",
    orderNumber: `NTF-NOEMAIL-${Date.now()}`,
    email: "not-an-email",
  });
  const rNoEmail = await happy.orchestrator.onOrderConfirmed(orderNoEmail);
  const skipped = rNoEmail?.jobs.find((j) => j.job.channel === "EMAIL");
  checks.push({
    name: "Missing/invalid email is skipped safely",
    ok:
      skipped?.job.status === "SKIPPED" &&
      skipped.job.lastErrorCode === "MISSING_OR_INVALID_EMAIL",
    detail: `${skipped?.job.status}/${skipped?.job.lastErrorCode}`,
  });

  const lineJobs = r1?.jobs.filter((j) => j.job.channel === "LINE") ?? [];
  checks.push({
    name: "LINE remains without jobs when identity missing",
    ok: lineJobs.length === 0,
    detail: `lineJobs=${lineJobs.length}`,
  });

  const processOk = await happy.queue.processPending(50);
  checks.push({
    name: "Valid email job sends via mock email provider",
    ok: processOk.sent >= 1,
    detail: JSON.stringify(processOk),
  });

  const preparing = await happy.orchestrator.onOrderPreparing(
    sampleOrder({
      id: randomUUID(),
      status: "preparing",
      orderNumber: `NTF-PREP-${Date.now()}`,
    }),
  );
  checks.push({
    name: "ORDER_PREPARING has no customer template jobs by default",
    ok: (preparing?.jobs.length ?? 0) === 0,
    detail: `jobs=${preparing?.jobs.length ?? 0}`,
  });

  // Failure / retry / maxAttempts on isolated stack
  const failing = createStack({ forceFailure: true });
  const failOrder = sampleOrder({
    id: randomUUID(),
    status: "confirmed",
    orderNumber: `NTF-FAIL-${Date.now()}`,
  });
  await failing.orchestrator.onOrderConfirmed(failOrder);
  const failJobId = (
    await failing.queueRepo.adminList({ page: 1, pageSize: 10 })
  ).items.find((i) => i.job.orderId === failOrder.id)?.job.id;

  const fail1 = await failing.queue.processPending(5);
  checks.push({
    name: "Mock provider failure creates failed attempt",
    ok: fail1.failed >= 1 || fail1.dead >= 1,
    detail: JSON.stringify(fail1),
  });

  const afterFail = failJobId
    ? await failing.queueRepo.findById(failJobId)
    : null;
  checks.push({
    name: "Transient failure schedules retry (FAILED + future schedule)",
    ok: afterFail?.status === "FAILED" && afterFail.attemptCount === 1,
    detail: afterFail
      ? `${afterFail.status} attempts=${afterFail.attemptCount}`
      : "missing",
  });

  if (failJobId) {
    await failing.queueRepo.resetForRetry(failJobId, new Date(0));
    await failing.queue.processPending(1);
    await failing.queueRepo.resetForRetry(failJobId, new Date(0));
    const last = await failing.queue.processPending(1);
    const after = await failing.queueRepo.findById(failJobId);
    checks.push({
      name: "maxAttempts stops further retries (DEAD)",
      ok: after?.status === "DEAD" || last.dead >= 1,
      detail: `status=${after?.status} attempts=${after?.attemptCount}`,
    });

    const retried = await failing.queue.retryFailed(failJobId);
    checks.push({
      name: "Manual retry resets job to PENDING",
      ok: retried.status === "PENDING",
      detail: retried.status,
    });
  } else {
    checks.push({
      name: "maxAttempts stops further retries (DEAD)",
      ok: false,
      detail: "fail job missing",
    });
    checks.push({
      name: "Manual retry resets job to PENDING",
      ok: false,
      detail: "fail job missing",
    });
  }

  // Process limit on isolated stack
  const limitedStack = createStack();
  await limitedStack.orchestrator.onOrderConfirmed(
    sampleOrder({ id: randomUUID(), orderNumber: `NTF-LIM-A-${Date.now()}` }),
  );
  await limitedStack.orchestrator.onOrderConfirmed(
    sampleOrder({ id: randomUUID(), orderNumber: `NTF-LIM-B-${Date.now()}` }),
  );
  const limited = await limitedStack.queue.processPending(1);
  checks.push({
    name: "Process endpoint respects limit",
    ok: limited.processed === 1,
    detail: `processed=${limited.processed}`,
  });

  const listPage = await happy.queueRepo.adminList({ page: 1, pageSize: 10 });
  checks.push({
    name: "Admin notification list loads with masked recipients",
    ok:
      listPage.items.length > 0 &&
      listPage.items.every((item) => item.recipientMasked.includes("***")),
    detail: listPage.items[0]?.recipientMasked,
  });

  checks.push({
    name: "Recipient is masked",
    ok: maskEmail("customer@example.com") === "cu***@example.com",
    detail: maskEmail("customer@example.com"),
  });

  let threw = false;
  try {
    await happy.orchestrator.onOrderConfirmed(
      sampleOrder({
        id: randomUUID(),
        orderNumber: `NTF-SAFE-${Date.now()}`,
      }),
    );
  } catch {
    threw = true;
  }
  checks.push({
    name: "Orchestrator does not throw on enqueue path",
    ok: !threw,
  });

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    console.log(
      `${check.ok ? "PASS" : "FAIL"} — ${check.name}${check.detail ? ` (${check.detail})` : ""}`,
    );
  }

  if (failed.length) {
    console.error(`\n${failed.length}/${checks.length} checks failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${checks.length} notification smoke checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
