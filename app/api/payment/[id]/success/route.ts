import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { paymentService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Mock-provider settlement only — not a real gateway webhook. */
export async function POST(_request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    const data = await paymentService.settleMockPayment(id, "SUCCESS");
    return ok(data);
  });
}
