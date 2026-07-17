import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { paymentService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    const data = await paymentService.cancelPayment(id);
    return ok(data);
  });
}
