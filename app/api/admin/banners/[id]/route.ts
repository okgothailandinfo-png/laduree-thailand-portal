import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminBannerService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminBannerService.getById(id);
    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const body = await request.json();
    const input = adminBannerService.parseUpdateBody(body);
    const data = await adminBannerService.update(id, input);
    return ok(data);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    await adminBannerService.remove(id);
    return ok({ deleted: true });
  });
}
