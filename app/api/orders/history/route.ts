import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { orderService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

/**
 * GET /api/orders/history?ids=id1,id2
 * Customer order history for browser-tracked order ids (no auth).
 */
export async function GET(request: Request) {
  return handleApi(async () => {
    const url = new URL(request.url);
    const raw = url.searchParams.get("ids")?.trim() ?? "";
    if (!raw) {
      return ok([]);
    }

    const ids = raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length > 50) {
      throw new AppError(
        "VALIDATION_ERROR",
        "ids must contain at most 50 order identifiers.",
        { details: { field: "ids" } },
      );
    }

    const data = await orderService.listOrderHistory(ids);
    return ok(data);
  });
}
