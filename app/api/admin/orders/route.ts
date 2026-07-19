import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminOrderService } from "@/src/server/services/container";

/**
 * GET /api/admin/orders
 * Mock admin session required (non-production authorization).
 */
export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminOrderService.parseListQuery(searchParams);
    const data = await adminOrderService.list(query);
    return ok(data);
  }, request);
}
