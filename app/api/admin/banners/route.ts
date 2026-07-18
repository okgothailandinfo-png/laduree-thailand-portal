import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminBannerService } from "@/src/server/services/container";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const query = adminBannerService.parseListQuery(searchParams);
    const data = await adminBannerService.list(query);
    return ok(data);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const body = await request.json();
    const input = adminBannerService.parseCreateBody(body);
    const data = await adminBannerService.create(input);
    return created(data);
  });
}
