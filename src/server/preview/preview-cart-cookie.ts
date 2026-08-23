/**
 * Sprint 34D — preview-only cart snapshot.
 *
 * Mock carts are in-memory and do not survive Vercel serverless isolates.
 * Persist a cookie snapshot only when PREVIEW_TEST_CATALOG is active.
 * Not a production database. Not used for payment, orders, or delivery.
 */

import { cookies } from "next/headers";
import { env } from "@/src/server/config/env";
import { isPreviewTestCatalogEnabled } from "@/lib/preview/preview-test-catalog";
import type { Cart } from "@/src/server/models/cart";

export const PREVIEW_CART_COOKIE_NAME = "laduree_preview_cart";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
const MAX_COOKIE_CHARS = 3500;

async function cookieStore() {
  try {
    return await cookies();
  } catch {
    return null;
  }
}

function isCartSnapshot(value: unknown): value is Cart {
  if (typeof value !== "object" || value === null) return false;
  const cart = value as Cart;
  return (
    typeof cart.id === "string" &&
    cart.id.length > 0 &&
    cart.currency === "THB" &&
    Array.isArray(cart.items)
  );
}

export async function readPreviewCartCookie(): Promise<Cart | null> {
  if (!isPreviewTestCatalogEnabled()) return null;
  const store = await cookieStore();
  const raw = store?.get(PREVIEW_CART_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCartSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writePreviewCartCookie(cart: Cart): Promise<void> {
  if (!isPreviewTestCatalogEnabled()) return;
  const store = await cookieStore();
  if (!store) return;
  const payload = JSON.stringify(cart);
  if (payload.length > MAX_COOKIE_CHARS) return;
  store.set(PREVIEW_CART_COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: env.nodeEnv === "production",
  });
}

export async function clearPreviewCartCookie(): Promise<void> {
  const store = await cookieStore();
  store?.delete(PREVIEW_CART_COOKIE_NAME);
}
