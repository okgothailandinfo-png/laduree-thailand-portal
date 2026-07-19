import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminNotificationService } from "@/src/server/services/container";

/**
 * GET /api/admin/notifications/settings
 */
export async function GET() {
  return handleApi(async () => {
    await requireAdminSession();
    const data = await adminNotificationService.listSettings();
    return ok(data);
  });
}

/**
 * PATCH /api/admin/notifications/settings
 * Body: { settings: Array<{ key: string; isEnabled: boolean }> }
 */
export async function PATCH(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const raw = await request.json();
    const updates = adminNotificationService.parseSettingsBody(raw);
    const data = await adminNotificationService.updateSettings(updates);
    return ok(data);
  });
}
