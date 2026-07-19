import {
  readCartIdFromCookie,
  writeCartIdCookie,
} from "@/src/server/api/cart-session";
import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { cartService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const cartId = await readCartIdFromCookie();
    const input = cartService.parseUpdateItemBody(raw);
    const data = await cartService.updateItem(cartId, id, input);
    await writeCartIdCookie(data.id);
    return ok(data);
  }, request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    const cartId = await readCartIdFromCookie();
    const data = await cartService.removeItem(cartId, id);
    await writeCartIdCookie(data.id);
    return ok(data);
  }, request);
}
