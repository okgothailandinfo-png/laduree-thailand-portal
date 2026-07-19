import type {
  AdminOrderDetailDto,
  AdminOrderListResult,
  AdminOrderStatus,
  AdminPaymentStatus,
  AdminUpdateOrderPaymentInput,
  AdminUpdateOrderStatusInput,
} from "@/src/server/admin/dto";
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

export type AdminOrderListParams = {
  search?: string;
  status?: AdminOrderStatus | "all";
  paymentStatus?: Exclude<AdminPaymentStatus, "none"> | "all";
  boutiqueId?: string | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchAdminOrders(
  params: AdminOrderListParams = {},
): Promise<AdminOrderListResult> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.paymentStatus && params.paymentStatus !== "all") {
    query.set("paymentStatus", params.paymentStatus);
  }
  if (params.boutiqueId && params.boutiqueId !== "all") {
    query.set("boutiqueId", params.boutiqueId);
  }
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));
  return adminFetch<AdminOrderListResult>(
    `/api/admin/orders?${query.toString()}`,
  );
}

export async function fetchAdminOrder(
  id: string,
): Promise<AdminOrderDetailDto> {
  return adminFetch<AdminOrderDetailDto>(`/api/admin/orders/${id}`);
}

export async function updateAdminOrderStatus(
  id: string,
  input: AdminUpdateOrderStatusInput,
): Promise<AdminOrderDetailDto> {
  return adminFetch<AdminOrderDetailDto>(`/api/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateAdminOrderPayment(
  id: string,
  input: AdminUpdateOrderPaymentInput,
): Promise<AdminOrderDetailDto> {
  return adminFetch<AdminOrderDetailDto>(`/api/admin/orders/${id}/payment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Boutique options for order filters (public boutique list; ids/names only). */
export async function fetchAdminOrderBoutiques(): Promise<
  Array<{ id: string; name: string; code: string }>
> {
  return adminFetch<Array<{ id: string; name: string; code: string }>>(
    "/api/boutiques",
  );
}

export { AdminApiError };
