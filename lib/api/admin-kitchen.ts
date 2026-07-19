import type {
  AdminKitchenOrderListResult,
  AdminOrderStatus,
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

export type AdminKitchenOrderListParams = {
  date?: string;
  boutiqueId?: string | "all";
  status?: AdminOrderStatus | "all";
  search?: string;
};

export async function fetchAdminKitchenOrders(
  params: AdminKitchenOrderListParams = {},
): Promise<AdminKitchenOrderListResult> {
  const query = new URLSearchParams();
  if (params.date) query.set("date", params.date);
  if (params.boutiqueId && params.boutiqueId !== "all") {
    query.set("boutiqueId", params.boutiqueId);
  }
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.search) query.set("search", params.search);

  const response = await fetch(
    `/api/admin/kitchen/orders?${query.toString()}`,
    {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    },
  );
  return parseAdminResponse<AdminKitchenOrderListResult>(response);
}

export { AdminApiError };
