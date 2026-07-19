import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { orderService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/orders/[id]/completion
 * Customer pickup completion + digital receipt payload.
 */
export async function GET(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    const data = await orderService.getOrderCompletion(id);
    return ok(data);
  });
}
