import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminHomepageService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const body = await request.json();
    const input = adminHomepageService.parseUpdateContentBody(body);
    const data = await adminHomepageService.updateContent(id, input);
    return ok(data);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    await adminHomepageService.removeContent(id);
    return ok({ deleted: true });
  });
}
