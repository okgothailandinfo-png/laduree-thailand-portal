import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminMediaService } from "@/src/server/services/container";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminMediaService.parseListQuery(searchParams);
    const data = await adminMediaService.list(query);
    return ok(data);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const body = await request.json();
    const input = adminMediaService.parseCreateBody(body);
    const data = await adminMediaService.create(input);
    return created(data);
  });
}
