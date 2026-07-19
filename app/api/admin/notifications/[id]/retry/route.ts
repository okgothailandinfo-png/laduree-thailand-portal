import { MOCK_ADMIN_USER } from "@/lib/admin/session";
import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminWrite } from "@/src/server/admin/auth";
import { writeAuditLog } from "@/src/server/audit/audit.service";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { adminNotificationService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/notifications/[id]/retry
 */
export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    await assertRateLimit({
      bucket: "notification-retry",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 30,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const data = await adminNotificationService.retry(id);
    await writeAuditLog({
      actorId: MOCK_ADMIN_USER.id,
      action: "notification.retry",
      entityType: "NotificationJob",
      entityId: id,
      metadata: { status: data.status },
    });
    return ok(data);
  }, request);
}
