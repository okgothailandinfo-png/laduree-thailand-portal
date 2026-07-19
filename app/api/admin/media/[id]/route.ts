import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession, requireAdminWrite } from "@/src/server/admin/auth";
import { adminMediaService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminMediaService.getById(id);
    return ok(data);
  }, request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const { id } = await context.params;
    await adminMediaService.remove(id);
    return ok({ deleted: true });
  }, request);
}
