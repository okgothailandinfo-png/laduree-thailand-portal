import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminOrderService } from "@/src/server/services/container";

/**
 * GET /api/admin/kitchen/orders
 * Operational kitchen board list — mock admin session required (non-production authorization).
 *
 * Query: date (YYYY-MM-DD, default today Asia/Bangkok), boutiqueId, status, search
 */
export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminOrderService.parseKitchenQuery(searchParams);
    const data = await adminOrderService.listKitchen(query);
    return ok(data);
  }, request);
}
