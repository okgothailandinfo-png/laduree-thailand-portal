import { handleApi } from "@/src/server/api/handle";
import { created } from "@/src/server/api/responses";
import { requireAdminSession } from "@/src/server/admin/auth";
import { adminMediaService } from "@/src/server/services/container";

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminSession();
    const formData = await request.formData();
    const data = await adminMediaService.upload(formData);
    return created(data);
  });
}
