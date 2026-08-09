import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { verifyOrderAccessToken } from "@/src/server/orders/order-access-token";
import { orderService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

/**
 * GET /api/orders/history?ids=id1,id2&tokens=t1,t2
 * Customer order history — each id must include a matching capability token.
 */
export async function GET(request: Request) {
  return handleApi(async () => {
    await assertRateLimit({
      bucket: "orders-history",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 60,
      windowMs: 60_000,
    });

    const url = new URL(request.url);
    const rawIds = url.searchParams.get("ids")?.trim() ?? "";
    const rawTokens = url.searchParams.get("tokens")?.trim() ?? "";
    if (!rawIds) {
      return ok([]);
    }

    const ids = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const tokens = rawTokens
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    if (ids.length > 50) {
      throw new AppError(
        "VALIDATION_ERROR",
        "ids must contain at most 50 order identifiers.",
        { details: { field: "ids" } },
      );
    }

    if (tokens.length !== ids.length) {
      throw new AppError(
        "UNAUTHORIZED",
        "Each order id requires a matching access token.",
        { status: 401, details: { field: "tokens" } },
      );
    }

    const authorizedIds: string[] = [];
    for (let index = 0; index < ids.length; index += 1) {
      const orderId = ids[index]!;
      const token = tokens[index]!;
      verifyOrderAccessToken(token, orderId, "history");
      authorizedIds.push(orderId);
    }

    const data = await orderService.listOrderHistory(authorizedIds);
    return ok(data);
  }, request);
}
