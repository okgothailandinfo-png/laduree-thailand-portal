import type {
  AdminNotificationDetail,
  AdminNotificationListPage,
  AdminNotificationListQuery,
  NotificationProvider,
  NotificationQueueRepository,
  NotificationTemplateService,
} from "@/src/server/notifications/interfaces";
import { recipientLogMeta } from "@/src/server/notifications/masking";
import type {
  EnqueueJobInput,
  NotificationChannel,
  NotificationJob,
  ProcessPendingResult,
} from "@/src/server/notifications/types";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";

const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;

function backoffMs(attemptCount: number): number {
  const exp = Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * 2 ** Math.max(0, attemptCount - 1),
  );
  return exp;
}

export class NotificationQueueService {
  constructor(
    private readonly queue: NotificationQueueRepository,
    private readonly templates: NotificationTemplateService,
    private readonly providers: Record<NotificationChannel, NotificationProvider>,
    private readonly defaultMaxAttempts: number,
    private readonly defaultProcessLimit: number,
  ) {}

  async enqueue(input: EnqueueJobInput): Promise<{
    job: NotificationJob;
    created: boolean;
  }> {
    const result = await this.queue.enqueue({
      ...input,
      maxAttempts: input.maxAttempts ?? this.defaultMaxAttempts,
    });

    if (result.created) {
      logger.info("Notification job enqueued", {
        jobId: result.job.id,
        eventType: result.job.eventType,
        orderId: result.job.orderId,
        status: result.job.status,
        templateKey: result.job.templateKey,
        ...recipientLogMeta(result.job.channel, result.job.recipient),
        skipped: Boolean(input.skipReason),
        skipReason: input.skipReason ?? undefined,
      });
    } else {
      logger.info("Notification job enqueue skipped (duplicate)", {
        jobId: result.job.id,
        eventType: result.job.eventType,
        orderId: result.job.orderId,
        idempotencyKey: result.job.idempotencyKey,
      });
    }

    return result;
  }

  async processPending(limit?: number): Promise<ProcessPendingResult> {
    const take = Math.max(1, Math.min(limit ?? this.defaultProcessLimit, 100));
    const now = new Date();
    const claimed = await this.queue.claimPending({ limit: take, now });

    const summary: ProcessPendingResult = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      dead: 0,
      retried: 0,
    };

    for (const job of claimed) {
      summary.processed += 1;
      await this.processJob(job, summary);
    }

    return summary;
  }

  async retryFailed(jobId: string): Promise<NotificationJob> {
    const job = await this.queue.resetForRetry(jobId, new Date());
    logger.info("Notification retry scheduled", {
      jobId: job.id,
      eventType: job.eventType,
      orderId: job.orderId,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      manual: true,
    });
    return job;
  }

  async markSent(params: {
    jobId: string;
    provider: string;
    providerMessageId: string;
  }): Promise<NotificationJob> {
    return this.queue.markSent({
      ...params,
      attemptedAt: new Date(),
    });
  }

  async markFailed(params: {
    jobId: string;
    provider: string;
    errorCode: string;
    retryable: boolean;
    attemptCount: number;
    maxAttempts: number;
  }): Promise<NotificationJob> {
    const attemptedAt = new Date();
    const dead =
      !params.retryable || params.attemptCount >= params.maxAttempts;
    const nextScheduledAt = dead
      ? null
      : new Date(attemptedAt.getTime() + backoffMs(params.attemptCount));

    const job = await this.queue.markFailed({
      jobId: params.jobId,
      provider: params.provider,
      errorCode: params.errorCode,
      attemptedAt,
      nextScheduledAt,
      dead,
    });

    if (dead) {
      logger.warn("Notification max attempts reached", {
        jobId: job.id,
        eventType: job.eventType,
        orderId: job.orderId,
        errorCode: params.errorCode,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
      });
    } else {
      logger.info("Notification retry scheduled", {
        jobId: job.id,
        eventType: job.eventType,
        orderId: job.orderId,
        errorCode: params.errorCode,
        attemptCount: job.attemptCount,
        scheduledAt: job.scheduledAt,
      });
    }

    return job;
  }

  async list(
    query: AdminNotificationListQuery,
  ): Promise<AdminNotificationListPage> {
    return this.queue.adminList(query);
  }

  async getById(id: string): Promise<AdminNotificationDetail> {
    const detail = await this.queue.adminFindById(id);
    if (!detail) {
      throw new AppError("NOT_FOUND", `Notification job not found: ${id}`);
    }
    return detail;
  }

  private async processJob(
    job: NotificationJob,
    summary: ProcessPendingResult,
  ): Promise<void> {
    const provider = this.providers[job.channel];
    const attemptedAt = new Date();

    try {
      const rendered = this.templates.render(job.templateKey, job.payloadJson);
      const result = await provider.send({
        channel: job.channel,
        recipient: job.recipient,
        templateKey: job.templateKey,
        rendered,
        meta: {
          jobId: job.id,
          eventType: job.eventType,
          orderId: job.orderId,
        },
      });

      if (result.ok) {
        await this.queue.markSent({
          jobId: job.id,
          provider: provider.providerName,
          providerMessageId: result.providerMessageId,
          attemptedAt,
        });
        summary.sent += 1;
        logger.info("Notification send success", {
          jobId: job.id,
          eventType: job.eventType,
          orderId: job.orderId,
          provider: provider.providerName,
          providerMessageId: result.providerMessageId,
          ...recipientLogMeta(job.channel, job.recipient),
        });
        return;
      }

      const updated = await this.markFailed({
        jobId: job.id,
        provider: provider.providerName,
        errorCode: result.errorCode,
        retryable: result.retryable,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
      });

      if (updated.status === "DEAD") {
        summary.dead += 1;
      } else {
        summary.failed += 1;
        summary.retried += 1;
      }

      logger.warn("Notification send failure", {
        jobId: job.id,
        eventType: job.eventType,
        orderId: job.orderId,
        provider: provider.providerName,
        errorCode: result.errorCode,
        retryable: result.retryable,
        status: updated.status,
        ...recipientLogMeta(job.channel, job.recipient),
      });
    } catch (error) {
      const errorCode =
        error instanceof Error ? error.message.slice(0, 120) : "SEND_ERROR";
      const updated = await this.markFailed({
        jobId: job.id,
        provider: provider.providerName,
        errorCode,
        retryable: true,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
      });
      if (updated.status === "DEAD") summary.dead += 1;
      else {
        summary.failed += 1;
        summary.retried += 1;
      }
      logger.error("Notification send threw", {
        jobId: job.id,
        eventType: job.eventType,
        orderId: job.orderId,
        errorCode,
      });
    }
  }
}
