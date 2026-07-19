import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { pickupVerificationService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * POST /api/admin/pickup/[orderId]/complete
 * Complete pickup handoff after successful verification.
 * Mock admin session required (non-production authorization).
 */
export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { orderId } = await context.params;
    const body = await request.json();
    const input = pickupVerificationService.parseCompleteBody(body);
    const data = await pickupVerificationService.complete(orderId, input);
    return ok(data);
  });
}
