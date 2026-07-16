import { handleApi } from "@/src/server/api/handle";
import { created } from "@/src/server/api/responses";
import { orderService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const input = orderService.parseCreateOrderBody(raw);
    const data = await orderService.createOrder(input);
    return created(data);
  });
}
