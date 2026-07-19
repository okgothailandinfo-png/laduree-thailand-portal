import {
  readCartIdFromCookie,
  writeCartIdCookie,
} from "@/src/server/api/cart-session";
import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { cartService } from "@/src/server/services/container";

export async function GET(request: Request) {
  return handleApi(async () => {
    const cartId = await readCartIdFromCookie();
    const data = await cartService.getCart(cartId);
    await writeCartIdCookie(data.id);
    return ok(data);
  }, request);
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const cartId = await readCartIdFromCookie();
    const data = await cartService.clearCart(cartId);
    await writeCartIdCookie(data.id);
    return ok(data);
  }, request);
}
