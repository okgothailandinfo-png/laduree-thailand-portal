import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminHomepageService } from "@/src/server/services/container";

export async function GET() {
  return handleApi(async () => {
    await requireAdminSession();
    const data = await adminHomepageService.listContent();
    return ok(data);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const body = await request.json();
    const input = adminHomepageService.parseCreateContentBody(body);
    const data = await adminHomepageService.createContent(input);
    return created(data);
  });
}
