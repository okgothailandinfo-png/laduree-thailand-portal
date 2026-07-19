import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { productService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { slug } = await context.params;
    const data = await productService.getProductBySlug(slug);
    return ok(data);
  }, request);
}
