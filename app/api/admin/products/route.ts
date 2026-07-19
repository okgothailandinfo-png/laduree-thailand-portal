import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import { requireAdminSession, requireAdminWrite } from "@/src/server/admin/auth";
import { adminProductService } from "@/src/server/services/container";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminProductService.parseListQuery(searchParams);
    const data = await adminProductService.list(query);
    return ok(data);
  }, request);
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const body = await request.json();
    const input = adminProductService.parseCreateBody(body);
    const data = await adminProductService.create(input);
    return created(data);
  }, request);
}
