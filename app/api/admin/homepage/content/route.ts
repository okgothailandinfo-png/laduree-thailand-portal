import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import { requireAdminSession, requireAdminWrite } from "@/src/server/admin/auth";
import { adminHomepageService } from "@/src/server/services/container";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const data = await adminHomepageService.listContent();
    return ok(data);
  }, request);
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    const body = await request.json();
    const input = adminHomepageService.parseCreateContentBody(body);
    const data = await adminHomepageService.createContent(input);
    return created(data);
  }, request);
}
