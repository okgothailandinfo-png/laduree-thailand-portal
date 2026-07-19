import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminNotificationService } from "@/src/server/services/container";

/**
 * POST /api/admin/notifications/process
 * Process pending notification jobs (database-backed queue).
 * Optional body/query: { limit?: number }
 */
export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const queryLimit = searchParams.get("limit");
    let limit: number | undefined;

    if (queryLimit) {
      const parsed = Number.parseInt(queryLimit, 10);
      if (Number.isInteger(parsed) && parsed >= 1) {
        limit = Math.min(parsed, 100);
      }
    }

    let bodyLimit: number | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await request.json().catch(() => null);
      bodyLimit = adminNotificationService.parseProcessBody(raw).limit;
    }

    const data = await adminNotificationService.processPending(
      bodyLimit ?? limit,
    );
    return ok(data);
  });
}
