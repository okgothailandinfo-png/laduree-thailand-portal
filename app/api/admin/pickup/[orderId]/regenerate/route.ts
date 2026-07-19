import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminWrite } from "@/src/server/admin/auth";
import { pickupVerificationService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * POST /api/admin/pickup/[orderId]/regenerate
 * Invalidate previous credentials and issue new ones.
 * Mock admin session required (non-production authorization).
 */
export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const { orderId } = await context.params;
    const data = await pickupVerificationService.regenerate(orderId);
    return ok(data);
  }, request);
}
