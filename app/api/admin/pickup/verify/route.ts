import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminWrite } from "@/src/server/admin/auth";
import { pickupVerificationService } from "@/src/server/services/container";

/**
 * POST /api/admin/pickup/verify
 * Verify a QR token or short pickup code.
 * Mock admin session required (non-production authorization).
 */
export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const body = await request.json();
    const input = pickupVerificationService.parseVerifyBody(body);
    const data = await pickupVerificationService.verify(input, {
      rateLimitKey: "admin-pickup-verify",
    });
    return ok(data);
  }, request);
}
