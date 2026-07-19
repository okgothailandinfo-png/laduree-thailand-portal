import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminNotificationService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/notifications/[id]
 */
export async function GET(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminNotificationService.getById(id);
    return ok(data);
  });
}
