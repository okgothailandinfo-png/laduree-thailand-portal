import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminProductService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminProductService.getById(id);
    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const body = await request.json();
    const input = adminProductService.parseUpdateBody(body);
    const data = await adminProductService.update(id, input);
    return ok(data);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminProductService.remove(id);
    return ok(data);
  });
}
