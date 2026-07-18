import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminMediaService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminMediaService.getById(id);
    return ok(data);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    await adminMediaService.remove(id);
    return ok({ deleted: true });
  });
}
