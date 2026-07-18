import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminOrderService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/orders/[id]
 * Mock admin session required (non-production authorization).
 */
export async function GET(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminOrderService.getById(id);
    return ok(data);
  });
}
