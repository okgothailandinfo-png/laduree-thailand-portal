import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminNotificationService } from "@/src/server/services/container";

/**
 * GET /api/admin/notifications
 * Mock admin session required. List does not expose payloadJson.
 */
export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminNotificationService.parseListQuery(searchParams);
    const data = await adminNotificationService.list(query);
    return ok(data);
  });
}
