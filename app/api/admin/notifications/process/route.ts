import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminWrite } from "@/src/server/admin/auth";
import { writeAuditLog } from "@/src/server/audit/audit.service";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { adminNotificationService } from "@/src/server/services/container";
import { MOCK_ADMIN_USER } from "@/lib/admin/session";
import { logEvent } from "@/src/server/utils/logger";

/**
 * POST /api/admin/notifications/process
 * Process pending notification jobs (database-backed queue).
 * Optional body/query: { limit?: number }
 */
export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    await assertRateLimit({
      bucket: "notification-process",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 20,
      windowMs: 60_000,
    });

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

    try {
      const data = await adminNotificationService.processPending(
        bodyLimit ?? limit,
      );
      await writeAuditLog({
        actorId: MOCK_ADMIN_USER.id,
        action: "notification.process",
        entityType: "NotificationJob",
        metadata: {
          processed: data.processed,
          sent: data.sent,
          failed: data.failed,
        },
      });
      return ok(data);
    } catch (error) {
      logEvent.notificationProcessingFailed({
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }, request);
}
