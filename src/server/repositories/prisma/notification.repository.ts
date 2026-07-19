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
  NotificationEventType,
  NotificationJob,
  NotificationJobStatus,
  NotificationLog,
  NotificationSetting,
  NotificationTemplatePayload,
} from "@/src/server/notifications/types";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";
import type {
  NotificationChannel as PrismaChannel,
  NotificationEventType as PrismaEventType,
  NotificationJobStatus as PrismaJobStatus,
  Prisma,
} from "@prisma/client";

function toIso(value: Date): string {
  return value.toISOString();
}

function toPayload(value: Prisma.JsonValue): NotificationTemplatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      customerName: "",
      orderNumber: "",
      boutiqueName: "",
      pickupDate: "",
      pickupTime: "",
      total: "",
    };
  }
  const obj = value as Record<string, unknown>;
  return {
    customerName: String(obj.customerName ?? ""),
    orderNumber: String(obj.orderNumber ?? ""),
    boutiqueName: String(obj.boutiqueName ?? ""),
    pickupDate: String(obj.pickupDate ?? ""),
    pickupTime: String(obj.pickupTime ?? ""),
    total: String(obj.total ?? ""),
    ...(typeof obj.completionUrl === "string"
      ? { completionUrl: obj.completionUrl }
      : {}),
  };
}

function toJob(row: {
  id: string;
  eventType: PrismaEventType;
  orderId: string | null;
  channel: PrismaChannel;
  recipient: string;
  templateKey: string;
  payloadJson: Prisma.JsonValue;
  status: PrismaJobStatus;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: Date;
  processedAt: Date | null;
  lastErrorCode: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}): NotificationJob {
  return {
    id: row.id,
    eventType: row.eventType as NotificationEventType,
    orderId: row.orderId,
    channel: row.channel as NotificationChannel,
    recipient: row.recipient,
    templateKey: row.templateKey,
    payloadJson: toPayload(row.payloadJson),
    status: row.status as NotificationJobStatus,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    scheduledAt: toIso(row.scheduledAt),
    processedAt: row.processedAt ? toIso(row.processedAt) : null,
    lastErrorCode: row.lastErrorCode,
    idempotencyKey: row.idempotencyKey,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toLog(row: {
  id: string;
  jobId: string;
  provider: string;
  providerMessageId: string | null;
  status: string;
  errorCode: string | null;
  attemptedAt: Date;
  createdAt: Date;
}): NotificationLog {
  return {
    id: row.id,
    jobId: row.jobId,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    status: row.status,
    errorCode: row.errorCode,
    attemptedAt: toIso(row.attemptedAt),
    createdAt: toIso(row.createdAt),
  };
}

function toSetting(row: {
  id: string;
  key: string;
  channel: PrismaChannel;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): NotificationSetting {
  return {
    id: row.id,
    key: row.key,
    channel: row.channel as NotificationChannel,
    isEnabled: row.isEnabled,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export class PrismaNotificationQueueRepository
  implements NotificationQueueRepository
{
  async enqueue(input: EnqueueJobInput): Promise<{
    job: NotificationJob;
    created: boolean;
  }> {
    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return { job: toJob(existing), created: false };
    }

    const status: PrismaJobStatus = input.skipReason ? "SKIPPED" : "PENDING";
    try {
      const row = await prisma.notificationJob.create({
        data: {
          eventType: input.eventType as PrismaEventType,
          orderId: input.orderId,
          channel: input.channel as PrismaChannel,
          recipient: input.recipient,
          templateKey: input.templateKey,
          payloadJson: input.payload as unknown as Prisma.InputJsonValue,
          status,
          attemptCount: 0,
          maxAttempts: input.maxAttempts ?? 3,
          scheduledAt: input.scheduledAt ?? new Date(),
          processedAt: input.skipReason ? new Date() : null,
          lastErrorCode: input.skipReason ?? null,
          idempotencyKey: input.idempotencyKey,
        },
      });
      return { job: toJob(row), created: true };
    } catch (error) {
      // Race on unique idempotencyKey — treat as duplicate.
      const raced = await prisma.notificationJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (raced) {
        return { job: toJob(raced), created: false };
      }
      throw error;
    }
  }

  async findById(id: string): Promise<NotificationJob | null> {
    const row = await prisma.notificationJob.findUnique({ where: { id } });
    return row ? toJob(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<NotificationJob | null> {
    const row = await prisma.notificationJob.findUnique({
      where: { idempotencyKey: key },
    });
    return row ? toJob(row) : null;
  }

  async claimPending(
    params: ClaimPendingJobsParams,
  ): Promise<NotificationJob[]> {
    const claimed: NotificationJob[] = [];

    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "NotificationJob"
        WHERE "status" IN ('PENDING', 'FAILED')
          AND "scheduledAt" <= ${params.now}
          AND "attemptCount" < "maxAttempts"
        ORDER BY "scheduledAt" ASC
        LIMIT ${params.limit}
        FOR UPDATE SKIP LOCKED
      `;

      for (const { id } of rows) {
        const updated = await tx.notificationJob.update({
          where: { id },
          data: {
            status: "PROCESSING",
            attemptCount: { increment: 1 },
          },
        });
        claimed.push(toJob(updated));
      }
    });

    return claimed;
  }

  async markSent(params: {
    jobId: string;
    provider: string;
    providerMessageId: string;
    attemptedAt: Date;
  }): Promise<NotificationJob> {
    const row = await prisma.$transaction(async (tx) => {
      const job = await tx.notificationJob.update({
        where: { id: params.jobId },
        data: {
          status: "SENT",
          processedAt: params.attemptedAt,
          lastErrorCode: null,
        },
      });
      await tx.notificationLog.create({
        data: {
          jobId: params.jobId,
          provider: params.provider,
          providerMessageId: params.providerMessageId,
          status: "SENT",
          errorCode: null,
          attemptedAt: params.attemptedAt,
        },
      });
      return job;
    });
    return toJob(row);
  }

  async markFailed(params: {
    jobId: string;
    provider: string;
    errorCode: string;
    attemptedAt: Date;
    nextScheduledAt: Date | null;
    dead: boolean;
  }): Promise<NotificationJob> {
    const row = await prisma.$transaction(async (tx) => {
      const job = await tx.notificationJob.update({
        where: { id: params.jobId },
        data: {
          status: params.dead ? "DEAD" : "FAILED",
          processedAt: params.dead ? params.attemptedAt : null,
          lastErrorCode: params.errorCode,
          scheduledAt: params.nextScheduledAt ?? undefined,
        },
      });
      await tx.notificationLog.create({
        data: {
          jobId: params.jobId,
          provider: params.provider,
          providerMessageId: null,
          status: params.dead ? "DEAD" : "FAILED",
          errorCode: params.errorCode,
          attemptedAt: params.attemptedAt,
        },
      });
      return job;
    });
    return toJob(row);
  }

  async markSkipped(params: {
    jobId: string;
    errorCode: string;
    attemptedAt: Date;
  }): Promise<NotificationJob> {
    const row = await prisma.notificationJob.update({
      where: { id: params.jobId },
      data: {
        status: "SKIPPED",
        processedAt: params.attemptedAt,
        lastErrorCode: params.errorCode,
      },
    });
    return toJob(row);
  }

  async resetForRetry(
    jobId: string,
    scheduledAt: Date,
  ): Promise<NotificationJob> {
    const existing = await prisma.notificationJob.findUnique({
      where: { id: jobId },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", `Notification job not found: ${jobId}`);
    }
    if (existing.status !== "FAILED" && existing.status !== "DEAD") {
      throw new AppError(
        "CONFLICT",
        "Only failed or dead jobs can be manually retried.",
        { details: { status: existing.status } },
      );
    }

    const row = await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        scheduledAt,
        processedAt: null,
        lastErrorCode: null,
        // Allow one more attempt window after manual retry of DEAD jobs.
        maxAttempts:
          existing.status === "DEAD"
            ? existing.attemptCount + 1
            : existing.maxAttempts,
      },
    });
    return toJob(row);
  }

  async adminList(
    query: AdminNotificationListQuery,
  ): Promise<AdminNotificationListPage> {
    const where: Prisma.NotificationJobWhereInput = {};

    if (query.status && query.status !== "all") {
      where.status = query.status as PrismaJobStatus;
    }
    if (query.channel && query.channel !== "all") {
      where.channel = query.channel as PrismaChannel;
    }
    if (query.eventType && query.eventType !== "all") {
      where.eventType = query.eventType as PrismaEventType;
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { recipient: { contains: term, mode: "insensitive" } },
        { templateKey: { contains: term, mode: "insensitive" } },
        { idempotencyKey: { contains: term, mode: "insensitive" } },
        { order: { orderNumber: { contains: term, mode: "insensitive" } } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await prisma.$transaction([
      prisma.notificationJob.count({ where }),
      prisma.notificationJob.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: query.pageSize,
        include: { order: { select: { orderNumber: true } } },
      }),
    ]);

    return {
      total,
      items: rows.map((row) => {
        const job = toJob(row);
        return {
          job,
          orderNumber: row.order?.orderNumber ?? null,
          recipientMasked: maskRecipient(job.channel, job.recipient),
        };
      }),
    };
  }

  async adminFindById(id: string): Promise<AdminNotificationDetail | null> {
    const row = await prisma.notificationJob.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
        logs: { orderBy: { attemptedAt: "desc" } },
      },
    });
    if (!row) return null;
    const job = toJob(row);
    return {
      job,
      orderNumber: row.order?.orderNumber ?? null,
      recipientMasked: maskRecipient(job.channel, job.recipient),
      payloadSummary: job.payloadJson,
      logs: row.logs.map(toLog),
    };
  }

  async listLogs(jobId: string): Promise<NotificationLog[]> {
    const rows = await prisma.notificationLog.findMany({
      where: { jobId },
      orderBy: { attemptedAt: "desc" },
    });
    return rows.map(toLog);
  }
}

export class PrismaNotificationSettingRepository
  implements NotificationSettingRepository
{
  async list(): Promise<NotificationSetting[]> {
    const rows = await prisma.notificationSetting.findMany({
      orderBy: [{ channel: "asc" }, { key: "asc" }],
    });
    return rows.map(toSetting);
  }

  async findByKey(key: string): Promise<NotificationSetting | null> {
    const row = await prisma.notificationSetting.findUnique({ where: { key } });
    return row ? toSetting(row) : null;
  }

  async upsert(params: {
    key: string;
    channel: NotificationChannel;
    isEnabled: boolean;
  }): Promise<NotificationSetting> {
    const row = await prisma.notificationSetting.upsert({
      where: { key: params.key },
      create: {
        key: params.key,
        channel: params.channel as PrismaChannel,
        isEnabled: params.isEnabled,
      },
      update: {
        channel: params.channel as PrismaChannel,
        isEnabled: params.isEnabled,
      },
    });
    return toSetting(row);
  }

  async ensureDefaults(
    defaults: Array<{
      key: string;
      channel: NotificationChannel;
      isEnabled: boolean;
    }>,
  ): Promise<NotificationSetting[]> {
    for (const item of defaults) {
      await prisma.notificationSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          channel: item.channel as PrismaChannel,
          isEnabled: item.isEnabled,
        },
        update: {},
      });
    }
    return this.list();
  }
}
