import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminOrderService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/orders/[id]/status
 * Mock admin session required (non-production authorization).
 */
export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const body = await request.json();
    const input = adminOrderService.parseUpdateStatusBody(body);
    const data = await adminOrderService.updateStatus(id, input);
    return ok(data);
  });
}
