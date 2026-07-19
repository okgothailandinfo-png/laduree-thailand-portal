import type {
  AdminPickupCompleteInput,
  AdminPickupCompleteResultDto,
  AdminPickupVerifyInput,
  AdminPickupVerifyResultDto,
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

export async function verifyAdminPickup(
  input: AdminPickupVerifyInput,
): Promise<AdminPickupVerifyResultDto> {
  const response = await fetch("/api/admin/pickup/verify", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminPickupVerifyResultDto>(response);
}

export async function completeAdminPickup(
  orderId: string,
  input: AdminPickupCompleteInput,
): Promise<AdminPickupCompleteResultDto> {
  const response = await fetch(
    `/api/admin/pickup/${encodeURIComponent(orderId)}/complete`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseAdminResponse<AdminPickupCompleteResultDto>(response);
}

export { AdminApiError };
