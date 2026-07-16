import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { categoryService } from "@/src/server/services/container";

export async function GET() {
  return handleApi(async () => {
    const data = await categoryService.listCategories();
    return ok(data);
  });
}
