import { cookies } from "next/headers";

export const CART_COOKIE_NAME = "laduree_cart_id";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function readCartIdFromCookie(): Promise<string | undefined> {
  const store = await cookies();
  const value = store.get(CART_COOKIE_NAME)?.value?.trim();
  return value || undefined;
}

export async function writeCartIdCookie(cartId: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE_NAME, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearCartIdCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE_NAME);
}
