import type {
  EnqueueJobInput,
  NotificationChannel,
  NotificationEventType,
  NotificationJob,
  NotificationJobStatus,
  NotificationLog,
  NotificationSetting,
  ProviderSendFailure,
  ProviderSendInput,
  ProviderSendResult,
  RenderedNotification,
  NotificationTemplateKey,
  NotificationTemplatePayload,
} from "@/src/server/notifications/types";

export interface NotificationProvider {
  readonly providerName: string;
  send(
    input: ProviderSendInput,
  ): Promise<ProviderSendResult | ProviderSendFailure>;
  validateConfiguration(): Promise<{ ok: boolean; message?: string }>;
}

export type ClaimPendingJobsParams = {
  limit: number;
  now: Date;
};

export type AdminNotificationListQuery = {
  search?: string;
  status?: NotificationJobStatus | "all";
  channel?: NotificationChannel | "all";
  eventType?: NotificationEventType | "all";
  page: number;
  pageSize: number;
};

export type AdminNotificationListRow = {
  job: NotificationJob;
  orderNumber: string | null;
  recipientMasked: string;
};

export type AdminNotificationListPage = {
  items: AdminNotificationListRow[];
  total: number;
};

export type AdminNotificationDetail = {
  job: NotificationJob;
  orderNumber: string | null;
  recipientMasked: string;
  /** Safe summary of payload keys/values for admin detail (no secrets). */
  payloadSummary: NotificationTemplatePayload;
  logs: NotificationLog[];
};

export interface NotificationQueueRepository {
  enqueue(input: EnqueueJobInput): Promise<{
    job: NotificationJob;
    created: boolean;
  }>;
  findById(id: string): Promise<NotificationJob | null>;
  findByIdempotencyKey(key: string): Promise<NotificationJob | null>;
  /**
   * Atomically claim oldest due PENDING/FAILED-retryable jobs as PROCESSING.
   * Avoids concurrent processing of the same job where practical.
   */
  claimPending(params: ClaimPendingJobsParams): Promise<NotificationJob[]>;
  markSent(params: {
    jobId: string;
    provider: string;
    providerMessageId: string;
    attemptedAt: Date;
  }): Promise<NotificationJob>;
  markFailed(params: {
    jobId: string;
    provider: string;
    errorCode: string;
    attemptedAt: Date;
    /** Next schedule for retry, or null when dead. */
    nextScheduledAt: Date | null;
    dead: boolean;
  }): Promise<NotificationJob>;
  markSkipped(params: {
    jobId: string;
    errorCode: string;
    attemptedAt: Date;
  }): Promise<NotificationJob>;
  /** Reset a FAILED/DEAD job to PENDING for manual retry. */
  resetForRetry(jobId: string, scheduledAt: Date): Promise<NotificationJob>;
  adminList(
    query: AdminNotificationListQuery,
  ): Promise<AdminNotificationListPage>;
  adminFindById(id: string): Promise<AdminNotificationDetail | null>;
  listLogs(jobId: string): Promise<NotificationLog[]>;
}

export interface NotificationSettingRepository {
  list(): Promise<NotificationSetting[]>;
  findByKey(key: string): Promise<NotificationSetting | null>;
  upsert(params: {
    key: string;
    channel: NotificationChannel;
    isEnabled: boolean;
  }): Promise<NotificationSetting>;
  ensureDefaults(
    defaults: Array<{
      key: string;
      channel: NotificationChannel;
      isEnabled: boolean;
    }>,
  ): Promise<NotificationSetting[]>;
}

export interface NotificationTemplateService {
  render(
    templateKey: NotificationTemplateKey | string,
    payload: NotificationTemplatePayload,
  ): RenderedNotification;
}
