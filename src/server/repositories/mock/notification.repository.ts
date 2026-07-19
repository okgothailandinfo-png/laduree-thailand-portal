import { randomUUID } from "node:crypto";
import type {
  AdminNotificationDetail,
  AdminNotificationListPage,
  AdminNotificationListQuery,
  ClaimPendingJobsParams,
  NotificationQueueRepository,
  NotificationSettingRepository,
} from "@/src/server/notifications/interfaces";
import { maskRecipient } from "@/src/server/notifications/masking";
import type {
  EnqueueJobInput,
  NotificationChannel,
  NotificationJob,
  NotificationLog,
  NotificationSetting,
} from "@/src/server/notifications/types";
import { AppError } from "@/src/server/utils/errors";

function nowIso(): string {
  return new Date().toISOString();
}

export class MockNotificationQueueRepository
  implements NotificationQueueRepository
{
  private jobs = new Map<string, NotificationJob>();
  private byIdempotency = new Map<string, string>();
  private logs = new Map<string, NotificationLog[]>();
  private orderNumbers = new Map<string, string>();

  /** Test helper: associate orderId → orderNumber for list/detail. */
  setOrderNumber(orderId: string, orderNumber: string): void {
    this.orderNumbers.set(orderId, orderNumber);
  }

  async enqueue(input: EnqueueJobInput): Promise<{
    job: NotificationJob;
    created: boolean;
  }> {
    const existingId = this.byIdempotency.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.jobs.get(existingId);
      if (existing) return { job: existing, created: false };
    }

    const createdAt = nowIso();
    const job: NotificationJob = {
      id: randomUUID(),
      eventType: input.eventType,
      orderId: input.orderId,
      channel: input.channel,
      recipient: input.recipient,
      templateKey: input.templateKey,
      payloadJson: input.payload,
      status: input.skipReason ? "SKIPPED" : "PENDING",
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? 3,
      scheduledAt: (input.scheduledAt ?? new Date()).toISOString(),
      processedAt: input.skipReason ? createdAt : null,
      lastErrorCode: input.skipReason ?? null,
      idempotencyKey: input.idempotencyKey,
      createdAt,
      updatedAt: createdAt,
    };
    this.jobs.set(job.id, job);
    this.byIdempotency.set(job.idempotencyKey, job.id);
    this.logs.set(job.id, []);
    return { job, created: true };
  }

  async findById(id: string): Promise<NotificationJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<NotificationJob | null> {
    const id = this.byIdempotency.get(key);
    return id ? (this.jobs.get(id) ?? null) : null;
  }

  async claimPending(
    params: ClaimPendingJobsParams,
  ): Promise<NotificationJob[]> {
    const nowMs = params.now.getTime();
    const candidates = [...this.jobs.values()]
      .filter(
        (job) =>
          (job.status === "PENDING" || job.status === "FAILED") &&
          new Date(job.scheduledAt).getTime() <= nowMs &&
          job.attemptCount < job.maxAttempts,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
      .slice(0, params.limit);

    const claimed: NotificationJob[] = [];
    for (const job of candidates) {
      const updated: NotificationJob = {
        ...job,
        status: "PROCESSING",
        attemptCount: job.attemptCount + 1,
        updatedAt: nowIso(),
      };
      this.jobs.set(job.id, updated);
      claimed.push(updated);
    }
    return claimed;
  }

  async markSent(params: {
    jobId: string;
    provider: string;
    providerMessageId: string;
    attemptedAt: Date;
  }): Promise<NotificationJob> {
    const job = this.requireJob(params.jobId);
    const updated: NotificationJob = {
      ...job,
      status: "SENT",
      processedAt: params.attemptedAt.toISOString(),
      lastErrorCode: null,
      updatedAt: nowIso(),
    };
    this.jobs.set(job.id, updated);
    this.appendLog({
      jobId: params.jobId,
      provider: params.provider,
      providerMessageId: params.providerMessageId,
      status: "SENT",
      errorCode: null,
      attemptedAt: params.attemptedAt.toISOString(),
    });
    return updated;
  }

  async markFailed(params: {
    jobId: string;
    provider: string;
    errorCode: string;
    attemptedAt: Date;
    nextScheduledAt: Date | null;
    dead: boolean;
  }): Promise<NotificationJob> {
    const job = this.requireJob(params.jobId);
    const updated: NotificationJob = {
      ...job,
      status: params.dead ? "DEAD" : "FAILED",
      processedAt: params.dead ? params.attemptedAt.toISOString() : null,
      lastErrorCode: params.errorCode,
      scheduledAt: params.nextScheduledAt
        ? params.nextScheduledAt.toISOString()
        : job.scheduledAt,
      updatedAt: nowIso(),
    };
    this.jobs.set(job.id, updated);
    this.appendLog({
      jobId: params.jobId,
      provider: params.provider,
      providerMessageId: null,
      status: params.dead ? "DEAD" : "FAILED",
      errorCode: params.errorCode,
      attemptedAt: params.attemptedAt.toISOString(),
    });
    return updated;
  }

  async markSkipped(params: {
    jobId: string;
    errorCode: string;
    attemptedAt: Date;
  }): Promise<NotificationJob> {
    const job = this.requireJob(params.jobId);
    const updated: NotificationJob = {
      ...job,
      status: "SKIPPED",
      processedAt: params.attemptedAt.toISOString(),
      lastErrorCode: params.errorCode,
      updatedAt: nowIso(),
    };
    this.jobs.set(job.id, updated);
    return updated;
  }

  async resetForRetry(
    jobId: string,
    scheduledAt: Date,
  ): Promise<NotificationJob> {
    const job = this.requireJob(jobId);
    if (job.status !== "FAILED" && job.status !== "DEAD") {
      throw new AppError(
        "CONFLICT",
        "Only failed or dead jobs can be manually retried.",
        { details: { status: job.status } },
      );
    }
    const updated: NotificationJob = {
      ...job,
      status: "PENDING",
      scheduledAt: scheduledAt.toISOString(),
      processedAt: null,
      lastErrorCode: null,
      maxAttempts:
        job.status === "DEAD" ? job.attemptCount + 1 : job.maxAttempts,
      updatedAt: nowIso(),
    };
    this.jobs.set(job.id, updated);
    return updated;
  }

  async adminList(
    query: AdminNotificationListQuery,
  ): Promise<AdminNotificationListPage> {
    let rows = [...this.jobs.values()];
    if (query.status && query.status !== "all") {
      rows = rows.filter((j) => j.status === query.status);
    }
    if (query.channel && query.channel !== "all") {
      rows = rows.filter((j) => j.channel === query.channel);
    }
    if (query.eventType && query.eventType !== "all") {
      rows = rows.filter((j) => j.eventType === query.eventType);
    }
    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      rows = rows.filter((j) => {
        const orderNumber = j.orderId
          ? (this.orderNumbers.get(j.orderId) ?? "")
          : "";
        return (
          j.recipient.toLowerCase().includes(term) ||
          j.templateKey.toLowerCase().includes(term) ||
          j.idempotencyKey.toLowerCase().includes(term) ||
          orderNumber.toLowerCase().includes(term)
        );
      });
    }
    rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = rows.length;
    const start = (query.page - 1) * query.pageSize;
    const page = rows.slice(start, start + query.pageSize);
    return {
      total,
      items: page.map((job) => ({
        job,
        orderNumber: job.orderId
          ? (this.orderNumbers.get(job.orderId) ?? null)
          : null,
        recipientMasked: maskRecipient(job.channel, job.recipient),
      })),
    };
  }

  async adminFindById(id: string): Promise<AdminNotificationDetail | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    return {
      job,
      orderNumber: job.orderId
        ? (this.orderNumbers.get(job.orderId) ?? null)
        : null,
      recipientMasked: maskRecipient(job.channel, job.recipient),
      payloadSummary: job.payloadJson,
      logs: this.logs.get(id) ?? [],
    };
  }

  async listLogs(jobId: string): Promise<NotificationLog[]> {
    return this.logs.get(jobId) ?? [];
  }

  private requireJob(id: string): NotificationJob {
    const job = this.jobs.get(id);
    if (!job) {
      throw new AppError("NOT_FOUND", `Notification job not found: ${id}`);
    }
    return job;
  }

  private appendLog(
    partial: Omit<NotificationLog, "id" | "createdAt">,
  ): void {
    const list = this.logs.get(partial.jobId) ?? [];
    list.unshift({
      ...partial,
      id: randomUUID(),
      createdAt: nowIso(),
    });
    this.logs.set(partial.jobId, list);
  }
}

export class MockNotificationSettingRepository
  implements NotificationSettingRepository
{
  private settings = new Map<string, NotificationSetting>();

  async list(): Promise<NotificationSetting[]> {
    return [...this.settings.values()].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  }

  async findByKey(key: string): Promise<NotificationSetting | null> {
    return this.settings.get(key) ?? null;
  }

  async upsert(params: {
    key: string;
    channel: NotificationChannel;
    isEnabled: boolean;
  }): Promise<NotificationSetting> {
    const existing = this.settings.get(params.key);
    const now = nowIso();
    const row: NotificationSetting = {
      id: existing?.id ?? randomUUID(),
      key: params.key,
      channel: params.channel,
      isEnabled: params.isEnabled,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.settings.set(params.key, row);
    return row;
  }

  async ensureDefaults(
    defaults: Array<{
      key: string;
      channel: NotificationChannel;
      isEnabled: boolean;
    }>,
  ): Promise<NotificationSetting[]> {
    for (const item of defaults) {
      if (!this.settings.has(item.key)) {
        await this.upsert(item);
      }
    }
    return this.list();
  }
}
