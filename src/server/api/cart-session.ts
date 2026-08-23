import { cookies } from "next/headers";
import { env } from "@/src/server/config/env";
import { readPreviewCartCookie } from "@/src/server/preview/preview-cart-cookie";

export const CART_COOKIE_NAME = "laduree_cart_id";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function readCartIdFromCookie(): Promise<string | undefined> {
  const store = await cookies();
  const value = store.get(CART_COOKIE_NAME)?.value?.trim();
  if (value) return value;
  const preview = await readPreviewCartCookie();
  return preview?.id;
}

export async function writeCartIdCookie(cartId: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE_NAME, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: env.nodeEnv === "production",
  });
}

export async function clearCartIdCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE_NAME);
}
