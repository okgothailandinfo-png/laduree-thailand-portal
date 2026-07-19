import type {
  AdminNotificationDetailDto,
  AdminNotificationListResultDto,
  AdminNotificationSettingDto,
} from "@/src/server/admin/notification.service";
import type {
  NotificationChannel,
  NotificationEventType,
  NotificationJobStatus,
  ProcessPendingResult,
} from "@/src/server/notifications/types";
import { AdminApiError } from "@/lib/api/admin-catalog";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

async function parseAdminResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!response.ok || !payload.success) {
    const error = !payload.success
      ? payload.error
      : { code: "INTERNAL_ERROR", message: "Request failed." };
    throw new AdminApiError(error.message, {
      code: error.code,
      status: response.status,
      details: "details" in error ? error.details : undefined,
    });
  }
  return payload.data;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  return parseAdminResponse<T>(response);
}

export type AdminNotificationListParams = {
  search?: string;
  status?: NotificationJobStatus | "all";
  channel?: NotificationChannel | "all";
  eventType?: NotificationEventType | "all";
  page?: number;
  pageSize?: number;
};

export async function fetchAdminNotifications(
  params: AdminNotificationListParams = {},
): Promise<AdminNotificationListResultDto> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.channel && params.channel !== "all") {
    query.set("channel", params.channel);
  }
  if (params.eventType && params.eventType !== "all") {
    query.set("eventType", params.eventType);
  }
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));
  return adminFetch<AdminNotificationListResultDto>(
    `/api/admin/notifications?${query.toString()}`,
  );
}

export async function fetchAdminNotification(
  id: string,
): Promise<AdminNotificationDetailDto> {
  return adminFetch<AdminNotificationDetailDto>(
    `/api/admin/notifications/${id}`,
  );
}

export async function processAdminNotifications(
  limit?: number,
): Promise<ProcessPendingResult> {
  return adminFetch<ProcessPendingResult>("/api/admin/notifications/process", {
    method: "POST",
    body: JSON.stringify(limit !== undefined ? { limit } : {}),
  });
}

export async function retryAdminNotification(
  id: string,
): Promise<AdminNotificationDetailDto> {
  return adminFetch<AdminNotificationDetailDto>(
    `/api/admin/notifications/${id}/retry`,
    { method: "POST" },
  );
}

export async function fetchAdminNotificationSettings(): Promise<
  AdminNotificationSettingDto[]
> {
  return adminFetch<AdminNotificationSettingDto[]>(
    "/api/admin/notifications/settings",
  );
}

export async function updateAdminNotificationSettings(
  settings: Array<{ key: string; isEnabled: boolean }>,
): Promise<AdminNotificationSettingDto[]> {
  return adminFetch<AdminNotificationSettingDto[]>(
    "/api/admin/notifications/settings",
    {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    },
  );
}

export { AdminApiError };
