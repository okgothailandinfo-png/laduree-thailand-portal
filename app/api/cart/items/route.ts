import {
  readCartIdFromCookie,
  writeCartIdCookie,
} from "@/src/server/api/cart-session";
import { handleApi } from "@/src/server/api/handle";
import { created } from "@/src/server/api/responses";
import { cartService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const cartId = await readCartIdFromCookie();
    const input = cartService.parseAddItemBody(raw);
    const data = await cartService.addItem(cartId, input);
    await writeCartIdCookie(data.id);
    return created(data);
  }, request);
}
