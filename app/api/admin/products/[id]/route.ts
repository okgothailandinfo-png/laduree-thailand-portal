import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { requireAdminSession, requireAdminWrite } from "@/src/server/admin/auth";
import { adminProductService } from "@/src/server/services/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminSession();
    const { id } = await context.params;
    const data = await adminProductService.getById(id);
    return ok(data);
  }, request);
}

async function updateProduct(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = adminProductService.parseUpdateBody(body);
    const data = await adminProductService.update(id, input);
    return ok(data);
  }, request);
}

/** Partial update (Sprint 16B). */
export async function PATCH(request: Request, context: RouteContext) {
  return updateProduct(request, context);
}

/** Full update alias required by Admin runtime contract. */
export async function PUT(request: Request, context: RouteContext) {
  return updateProduct(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const data = await adminProductService.remove(id);
    return ok(data);
  }, request);
}
