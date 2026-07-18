import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { homepageService } from "@/src/server/services/container";

export async function GET() {
  return handleApi(async () => {
    const data = await homepageService.getHomepage();
    return ok(data);
  });
}
