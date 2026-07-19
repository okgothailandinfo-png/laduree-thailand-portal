import type { Order } from "@/src/server/models/order";
import type { NotificationQueueService } from "@/src/server/notifications/queue.service";
import type { NotificationSettingsService } from "@/src/server/notifications/settings.service";
import {
  isValidEmail,
  resolveLineRecipient,
} from "@/src/server/notifications/masking";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationJob,
  NotificationTemplatePayload,
} from "@/src/server/notifications/types";
import { EVENT_TEMPLATE_MAP } from "@/src/server/notifications/types";
import { logger } from "@/src/server/utils/logger";

function formatTotalThb(totalMinor: number): string {
  const thb = totalMinor / 100;
  return `฿${thb.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function buildPayload(
  order: Order,
  baseUrl: string,
): NotificationTemplatePayload {
  const completionUrl = `${baseUrl.replace(/\/$/, "")}/order-completed/${encodeURIComponent(order.id)}`;
  return {
    customerName: order.customer.customerName,
    orderNumber: order.orderNumber,
    boutiqueName: order.pickup.boutiqueName,
    pickupDate: order.pickup.dateKey,
    pickupTime: order.pickup.timeSlotLabel,
    total: formatTotalThb(order.totalMinor),
    completionUrl,
  };
}

function idempotencyKey(
  eventType: NotificationEventType,
  orderId: string,
  channel: NotificationChannel,
  version: string,
): string {
  return `${eventType}:${orderId}:${channel}:${version}`;
}

export type NotificationOrchestratorResult = {
  eventType: NotificationEventType;
  orderId: string;
  jobs: Array<{ job: NotificationJob; created: boolean }>;
};

/**
 * Domain Event → Notification Orchestrator.
 * Call only after the main domain transaction has committed.
 * Never throws to callers for delivery failures — best-effort enqueue.
 *
 * Transaction-boundary note: enqueue runs outside Prisma $transaction
 * (same pattern as pickup ensureForOrder after confirm). A crash between
 * commit and enqueue may leave a missing job until a later domain retry
 * or manual process.
 */
export class NotificationOrchestrator {
  constructor(
    private readonly queue: NotificationQueueService,
    private readonly settings: NotificationSettingsService,
    private readonly baseUrl: string,
  ) {}

  async onOrderConfirmed(order: Order): Promise<NotificationOrchestratorResult | null> {
    return this.safeEnqueue("ORDER_CONFIRMED", order, order.status);
  }

  async onPaymentFailed(order: Order): Promise<NotificationOrchestratorResult | null> {
    return this.safeEnqueue("PAYMENT_FAILED", order, "payment_failed");
  }

  async onOrderPreparing(order: Order): Promise<NotificationOrchestratorResult | null> {
    return this.safeEnqueue("ORDER_PREPARING", order, order.status);
  }

  async onOrderReadyForPickup(
    order: Order,
  ): Promise<NotificationOrchestratorResult | null> {
    return this.safeEnqueue("ORDER_READY_FOR_PICKUP", order, order.status);
  }

  async onOrderCancelled(order: Order): Promise<NotificationOrchestratorResult | null> {
    return this.safeEnqueue("ORDER_CANCELLED", order, order.status);
  }

  async onPickupCompleted(
    order: Order,
  ): Promise<NotificationOrchestratorResult | null> {
    return this.safeEnqueue("PICKUP_COMPLETED", order, order.status);
  }

  private async safeEnqueue(
    eventType: NotificationEventType,
    order: Order,
    version: string,
  ): Promise<NotificationOrchestratorResult | null> {
    try {
      return await this.enqueueForEvent(eventType, order, version);
    } catch (error) {
      logger.error("Notification enqueue failed (domain unaffected)", {
        eventType,
        orderId: order.id,
        message: error instanceof Error ? error.message : "unknown",
      });
      return null;
    }
  }

  private async enqueueForEvent(
    eventType: NotificationEventType,
    order: Order,
    version: string,
  ): Promise<NotificationOrchestratorResult> {
    const templateKey = EVENT_TEMPLATE_MAP[eventType];
    const payload = buildPayload(order, this.baseUrl);
    const jobs: Array<{ job: NotificationJob; created: boolean }> = [];

    if (!templateKey) {
      logger.info("Notification event has no customer template", {
        eventType,
        orderId: order.id,
      });
      return { eventType, orderId: order.id, jobs };
    }

    // EMAIL
    {
      const channel: NotificationChannel = "EMAIL";
      const enabled = await this.settings.isEventEnabled(channel, eventType);
      const email = order.customer.email?.trim() ?? "";
      const key = idempotencyKey(eventType, order.id, channel, version);

      if (!enabled) {
        logger.info("Notification email skipped — disabled", {
          eventType,
          orderId: order.id,
        });
      } else if (!isValidEmail(email)) {
        const result = await this.queue.enqueue({
          eventType,
          orderId: order.id,
          channel,
          recipient: email || "missing",
          templateKey,
          payload,
          idempotencyKey: key,
          skipReason: "MISSING_OR_INVALID_EMAIL",
        });
        jobs.push(result);
      } else {
        const result = await this.queue.enqueue({
          eventType,
          orderId: order.id,
          channel,
          recipient: email,
          templateKey,
          payload,
          idempotencyKey: key,
        });
        jobs.push(result);
      }
    }

    // LINE — never invent user IDs; phone ≠ LINE identity.
    {
      const channel: NotificationChannel = "LINE";
      const lineRecipient = resolveLineRecipient(order);
      if (!lineRecipient) {
        logger.info("Notification LINE skipped — identity not linked", {
          eventType,
          orderId: order.id,
          reason: "LINE_IDENTITY_NOT_LINKED",
        });
      } else {
        const enabled = await this.settings.isEventEnabled(channel, eventType);
        const key = idempotencyKey(eventType, order.id, channel, version);
        if (!enabled) {
          logger.info("Notification LINE skipped — disabled", {
            eventType,
            orderId: order.id,
          });
        } else {
          const result = await this.queue.enqueue({
            eventType,
            orderId: order.id,
            channel,
            recipient: lineRecipient,
            templateKey,
            payload,
            idempotencyKey: key,
          });
          jobs.push(result);
        }
      }
    }

    return { eventType, orderId: order.id, jobs };
  }
}
