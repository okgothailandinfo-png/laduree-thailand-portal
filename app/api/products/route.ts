import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { productService } from "@/src/server/services/container";

export async function GET() {
  return handleApi(async () => {
    const data = await productService.listProducts();
    return ok(data);
  });
}
