import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import { requireAdminSession, requireAdminWrite } from "@/src/server/admin/auth";
import { adminCategoryService } from "@/src/server/services/container";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminCategoryService.parseListQuery(searchParams);
    const data = await adminCategoryService.list(query);
    return ok(data);
  }, request);
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const body = await request.json();
    const input = adminCategoryService.parseCreateBody(body);
    const data = await adminCategoryService.create(input);
    return created(data);
  }, request);
}
