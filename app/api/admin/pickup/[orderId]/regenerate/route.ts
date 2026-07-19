import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { pickupVerificationService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * POST /api/admin/pickup/[orderId]/regenerate
 * Invalidate previous credentials and issue new ones.
 * Mock admin session required (non-production authorization).
 */
export async function POST(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { orderId } = await context.params;
    const data = await pickupVerificationService.regenerate(orderId);
    return ok(data);
  });
}
