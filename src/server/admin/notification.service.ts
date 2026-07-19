import { MOCK_ADMIN_USER } from "@/lib/admin/session";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import { writeAuditLog } from "@/src/server/audit/audit.service";
import type {
  AdminNotificationDetail,
  AdminNotificationListPage,
  AdminNotificationListQuery,
} from "@/src/server/notifications/interfaces";
import type { NotificationQueueService } from "@/src/server/notifications/queue.service";
import type { NotificationSettingsService } from "@/src/server/notifications/settings.service";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationJob,
  NotificationJobStatus,
  NotificationSetting,
  ProcessPendingResult,
} from "@/src/server/notifications/types";
import { AppError } from "@/src/server/utils/errors";
import {
  requireBoolean,
  requireObject,
} from "@/src/server/utils/validation";

const JOB_STATUSES: readonly NotificationJobStatus[] = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "SKIPPED",
  "DEAD",
] as const;

const CHANNELS: readonly NotificationChannel[] = ["EMAIL", "LINE"] as const;

const EVENT_TYPES: readonly NotificationEventType[] = [
  "ORDER_CONFIRMED",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "ORDER_PREPARING",
  "ORDER_READY_FOR_PICKUP",
  "ORDER_CANCELLED",
  "PICKUP_COMPLETED",
] as const;

function parsePositiveInt(
  value: string | null,
  field: string,
  fallback: number,
): number {
  if (value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a positive integer.`, {
      details: { field },
    });
  }
  return parsed;
}

/** List DTO — never expose raw payloadJson. */
export type AdminNotificationListItemDto = {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  orderId: string | null;
  orderNumber: string | null;
  recipientMasked: string;
  templateKey: string;
  status: NotificationJobStatus;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: string;
  processedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
};

export type AdminNotificationListResultDto = {
  items: AdminNotificationListItemDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminNotificationDetailDto = {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  orderId: string | null;
  orderNumber: string | null;
  recipientMasked: string;
  templateKey: string;
  status: NotificationJobStatus;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: string;
  processedAt: string | null;
  lastErrorCode: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  payloadSummary: AdminNotificationDetail["payloadSummary"];
  logs: AdminNotificationDetail["logs"];
};

export type AdminNotificationSettingDto = {
  id: string;
  key: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  updatedAt: string;
};

function toListItem(
  row: AdminNotificationListPage["items"][number],
): AdminNotificationListItemDto {
  const { job } = row;
  return {
    id: job.id,
    eventType: job.eventType,
    channel: job.channel,
    orderId: job.orderId,
    orderNumber: row.orderNumber,
    recipientMasked: row.recipientMasked,
    templateKey: job.templateKey,
    status: job.status,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    scheduledAt: job.scheduledAt,
    processedAt: job.processedAt,
    lastErrorCode: job.lastErrorCode,
    createdAt: job.createdAt,
  };
}

function toDetailDto(detail: AdminNotificationDetail): AdminNotificationDetailDto {
  const { job } = detail;
  return {
    id: job.id,
    eventType: job.eventType,
    channel: job.channel,
    orderId: job.orderId,
    orderNumber: detail.orderNumber,
    recipientMasked: detail.recipientMasked,
    templateKey: job.templateKey,
    status: job.status,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    scheduledAt: job.scheduledAt,
    processedAt: job.processedAt,
    lastErrorCode: job.lastErrorCode,
    idempotencyKey: job.idempotencyKey,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    payloadSummary: detail.payloadSummary,
    logs: detail.logs,
  };
}

export class AdminNotificationService {
  constructor(
    private readonly queue: NotificationQueueService,
    private readonly settings: NotificationSettingsService,
  ) {}

  parseListQuery(searchParams: URLSearchParams): AdminNotificationListQuery {
    const search = searchParams.get("search")?.trim() || undefined;
    const statusRaw = searchParams.get("status");
    const channelRaw = searchParams.get("channel");
    const eventRaw = searchParams.get("eventType");
    const page = parsePositiveInt(searchParams.get("page"), "page", 1);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get("pageSize"), "pageSize", 10),
      50,
    );

    let status: NotificationJobStatus | "all" = "all";
    if (statusRaw && statusRaw !== "all") {
      if (!JOB_STATUSES.includes(statusRaw as NotificationJobStatus)) {
        throw new AppError("VALIDATION_ERROR", "Invalid status filter.", {
          details: { field: "status" },
        });
      }
      status = statusRaw as NotificationJobStatus;
    }

    let channel: NotificationChannel | "all" = "all";
    if (channelRaw && channelRaw !== "all") {
      if (!CHANNELS.includes(channelRaw as NotificationChannel)) {
        throw new AppError("VALIDATION_ERROR", "Invalid channel filter.", {
          details: { field: "channel" },
        });
      }
      channel = channelRaw as NotificationChannel;
    }

    let eventType: NotificationEventType | "all" = "all";
    if (eventRaw && eventRaw !== "all") {
      if (!EVENT_TYPES.includes(eventRaw as NotificationEventType)) {
        throw new AppError("VALIDATION_ERROR", "Invalid eventType filter.", {
          details: { field: "eventType" },
        });
      }
      eventType = eventRaw as NotificationEventType;
    }

    return { search, status, channel, eventType, page, pageSize };
  }

  parseProcessBody(raw: unknown): { limit?: number } {
    if (raw === null || raw === undefined) return {};
    const body = requireObject(raw, "body");
    if (body.limit === undefined || body.limit === null) return {};
    if (typeof body.limit !== "number" || !Number.isInteger(body.limit) || body.limit < 1) {
      throw new AppError("VALIDATION_ERROR", "limit must be a positive integer.", {
        details: { field: "limit" },
      });
    }
    return { limit: Math.min(body.limit, 100) };
  }

  parseSettingsBody(raw: unknown): Array<{ key: string; isEnabled: boolean }> {
    const body = requireObject(raw, "body");
    const settings = body.settings;
    if (!Array.isArray(settings) || settings.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "settings must be a non-empty array.",
        { details: { field: "settings" } },
      );
    }
    return settings.map((item, index) => {
      const row = requireObject(item, `settings[${index}]`);
      if (typeof row.key !== "string" || !row.key.trim()) {
        throw new AppError("VALIDATION_ERROR", "settings.key is required.", {
          details: { field: `settings[${index}].key` },
        });
      }
      return {
        key: row.key.trim(),
        isEnabled: requireBoolean(row.isEnabled, `settings[${index}].isEnabled`),
      };
    });
  }

  async list(
    query: AdminNotificationListQuery,
  ): Promise<AdminNotificationListResultDto> {
    requirePrismaDataSource();
    const page = await this.queue.list(query);
    return {
      items: page.items.map(toListItem),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(id: string): Promise<AdminNotificationDetailDto> {
    requirePrismaDataSource();
    return toDetailDto(await this.queue.getById(id));
  }

  async processPending(limit?: number): Promise<ProcessPendingResult> {
    requirePrismaDataSource();
    return this.queue.processPending(limit);
  }

  async retry(id: string): Promise<AdminNotificationDetailDto> {
    requirePrismaDataSource();
    await this.queue.retryFailed(id);
    return this.getById(id);
  }

  async listSettings(): Promise<AdminNotificationSettingDto[]> {
    requirePrismaDataSource();
    const rows = await this.settings.list();
    return rows.map((row) => toSettingDto(row));
  }

  async updateSettings(
    updates: Array<{ key: string; isEnabled: boolean }>,
  ): Promise<AdminNotificationSettingDto[]> {
    requirePrismaDataSource();
    const rows = await this.settings.updateMany(updates);
    await writeAuditLog({
      actorId: MOCK_ADMIN_USER.id,
      action: "settings.change",
      entityType: "NotificationSetting",
      metadata: { keys: updates.map((item) => item.key) },
    });
    return rows.map((row) => toSettingDto(row));
  }
}

function toSettingDto(row: NotificationSetting): AdminNotificationSettingDto {
  return {
    id: row.id,
    key: row.key,
    channel: row.channel,
    isEnabled: row.isEnabled,
    updatedAt: row.updatedAt,
  };
}

export type { NotificationJob };
