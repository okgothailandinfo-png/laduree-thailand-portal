/** Notification domain types — Sprint 20A. */

export type NotificationChannel = "EMAIL" | "LINE";

export type NotificationEventType =
  | "ORDER_CONFIRMED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "ORDER_PREPARING"
  | "ORDER_READY_FOR_PICKUP"
  | "ORDER_CANCELLED"
  | "PICKUP_COMPLETED";

export type NotificationJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | "DEAD";

export type NotificationTemplateKey =
  | "order-confirmed"
  | "payment-failed"
  | "ready-for-pickup"
  | "order-cancelled"
  | "pickup-completed";

/** Structured template payload — no secrets, no provider responses. */
export type NotificationTemplatePayload = {
  customerName: string;
  orderNumber: string;
  boutiqueName: string;
  pickupDate: string;
  pickupTime: string;
  total: string;
  completionUrl?: string;
};

export type NotificationJob = {
  id: string;
  eventType: NotificationEventType;
  orderId: string | null;
  channel: NotificationChannel;
  recipient: string;
  templateKey: NotificationTemplateKey | string;
  payloadJson: NotificationTemplatePayload;
  status: NotificationJobStatus;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: string;
  processedAt: string | null;
  lastErrorCode: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationLog = {
  id: string;
  jobId: string;
  provider: string;
  providerMessageId: string | null;
  status: string;
  errorCode: string | null;
  attemptedAt: string;
  createdAt: string;
};

export type NotificationSetting = {
  id: string;
  key: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RenderedNotification = {
  subject: string;
  textBody: string;
  htmlBody?: string;
  lineText: string;
};

export type ProviderSendInput = {
  channel: NotificationChannel;
  recipient: string;
  templateKey: string;
  rendered: RenderedNotification;
  /** Safe correlation metadata only. */
  meta: {
    jobId: string;
    eventType: NotificationEventType;
    orderId: string | null;
  };
};

export type ProviderSendResult = {
  providerMessageId: string;
  ok: true;
};

export type ProviderSendFailure = {
  ok: false;
  errorCode: string;
  retryable: boolean;
};

export type EnqueueJobInput = {
  eventType: NotificationEventType;
  orderId: string | null;
  channel: NotificationChannel;
  recipient: string;
  templateKey: NotificationTemplateKey | string;
  payload: NotificationTemplatePayload;
  idempotencyKey: string;
  maxAttempts?: number;
  scheduledAt?: Date;
  /** When set, job is stored as SKIPPED without delivery. */
  skipReason?: string | null;
};

export type ProcessPendingResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  dead: number;
  retried: number;
};

export const CUSTOMER_DELIVERY_EVENTS: ReadonlySet<NotificationEventType> =
  new Set([
    "ORDER_CONFIRMED",
    "PAYMENT_FAILED",
    "ORDER_READY_FOR_PICKUP",
    "ORDER_CANCELLED",
    "PICKUP_COMPLETED",
  ]);

/** ORDER_PREPARING is not customer-delivered unless explicitly enabled. */
export const DEFAULT_DISABLED_CUSTOMER_EVENTS: ReadonlySet<NotificationEventType> =
  new Set(["ORDER_PREPARING", "PAYMENT_SUCCEEDED"]);

export const EVENT_TEMPLATE_MAP: Record<
  NotificationEventType,
  NotificationTemplateKey | null
> = {
  ORDER_CONFIRMED: "order-confirmed",
  PAYMENT_SUCCEEDED: null,
  PAYMENT_FAILED: "payment-failed",
  ORDER_PREPARING: null,
  ORDER_READY_FOR_PICKUP: "ready-for-pickup",
  ORDER_CANCELLED: "order-cancelled",
  PICKUP_COMPLETED: "pickup-completed",
};
