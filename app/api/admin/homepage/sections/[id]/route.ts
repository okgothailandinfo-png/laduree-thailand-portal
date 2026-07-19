import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminWrite } from "@/src/server/admin/auth";
import { adminHomepageService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = adminHomepageService.parseUpdateSectionBody(body);
    const data = await adminHomepageService.updateSection(id, input);
    return ok(data);
  }, request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const { id } = await context.params;
    await adminHomepageService.removeSection(id);
    return ok({ deleted: true });
  }, request);
}
