/**
 * Sprint 34E — preview-only order + payment snapshot.
 *
 * Mock orders/payments are in-memory and do not survive Vercel isolates.
 * Persist a cookie snapshot only when PREVIEW_TEST_CATALOG is active.
 * Sprint 34F also stores the capability token so Payment can recover
 * after reload / back-forward without client-readable storage.
 * Not a production database. Not used outside the Preview test catalog.
 */

import { cookies } from "next/headers";
import { env } from "@/src/server/config/env";
import { isPreviewTestCatalogEnabled } from "@/lib/preview/preview-test-catalog";
import type { Order } from "@/src/server/models/order";
import type { Payment } from "@/src/server/models/payment";

export const PREVIEW_COMMERCE_COOKIE_NAME = "laduree_preview_commerce";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
const MAX_COOKIE_CHARS = 4000;

export type PreviewCommerceSnapshot = {
  order: Order | null;
  payment: Payment | null;
  accessToken: string | null;
};

export type PreviewCookieStore = {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      maxAge?: number;
      secure?: boolean;
    },
  ): void;
  delete(name: string): void;
};

let testStore: PreviewCookieStore | null = null;

export function installPreviewCommerceCookieTestStore(
  store: PreviewCookieStore | null,
): void {
  testStore = store;
}

export function createMemoryPreviewCookieStore(): PreviewCookieStore {
  const values = new Map<string, string>();
  return {
    get(name) {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set(name, value) {
      values.set(name, value);
    },
    delete(name) {
      values.delete(name);
    },
  };
}

async function cookieStore(): Promise<PreviewCookieStore | null> {
  if (testStore) return testStore;
  try {
    return await cookies();
  } catch {
    return null;
  }
}

function isOrderSnapshot(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Order;
  return (
    typeof order.id === "string" &&
    order.id.length > 0 &&
    order.serviceType === "PICKUP" &&
    order.currency === "THB" &&
    Array.isArray(order.items)
  );
}

function isPaymentSnapshot(value: unknown): value is Payment {
  if (typeof value !== "object" || value === null) return false;
  const payment = value as Payment;
  return (
    typeof payment.paymentId === "string" &&
    payment.paymentId.length > 0 &&
    typeof payment.orderId === "string" &&
    payment.orderId.length > 0
  );
}

export function parsePreviewCommerceSnapshot(
  raw: string,
): PreviewCommerceSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as {
      order?: unknown;
      payment?: unknown;
      accessToken?: unknown;
    };
    const order = isOrderSnapshot(record.order) ? record.order : null;
    const payment = isPaymentSnapshot(record.payment) ? record.payment : null;
    const accessToken =
      typeof record.accessToken === "string" &&
      record.accessToken.includes(".")
        ? record.accessToken
        : null;
    if (!order && !payment && !accessToken) return null;
    return { order, payment, accessToken };
  } catch {
    return null;
  }
}

async function writeSnapshot(
  snapshot: PreviewCommerceSnapshot,
): Promise<void> {
  if (!isPreviewTestCatalogEnabled()) return;
  const store = await cookieStore();
  if (!store) return;
  const payload = JSON.stringify(snapshot);
  if (payload.length > MAX_COOKIE_CHARS) return;
  store.set(PREVIEW_COMMERCE_COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: env.nodeEnv === "production",
  });
}

export async function readPreviewCommerceSnapshot(): Promise<PreviewCommerceSnapshot | null> {
  if (!isPreviewTestCatalogEnabled()) return null;
  const store = await cookieStore();
  const raw = store?.get(PREVIEW_COMMERCE_COOKIE_NAME)?.value;
  if (!raw) return null;
  return parsePreviewCommerceSnapshot(raw);
}

export async function writePreviewOrderCookie(order: Order): Promise<void> {
  if (order.serviceType !== "PICKUP") return;
  const current = await readPreviewCommerceSnapshot();
  const payment =
    current?.payment && current.payment.orderId === order.id
      ? current.payment
      : null;
  const accessToken =
    current?.accessToken && current.order?.id === order.id
      ? current.accessToken
      : null;
  await writeSnapshot({ order, payment, accessToken });
}

export async function writePreviewPaymentCookie(
  payment: Payment,
): Promise<void> {
  const current = await readPreviewCommerceSnapshot();
  const order =
    current?.order && current.order.id === payment.orderId
      ? current.order
      : null;
  const accessToken =
    current?.accessToken && current.order?.id === payment.orderId
      ? current.accessToken
      : null;
  await writeSnapshot({ order, payment, accessToken });
}

export async function writePreviewOrderAccessToken(
  orderId: string,
  accessToken: string,
): Promise<void> {
  const id = orderId.trim();
  const token = accessToken.trim();
  if (!id || !token.includes(".")) return;
  const current = await readPreviewCommerceSnapshot();
  if (current?.order && current.order.id !== id) return;
  await writeSnapshot({
    order: current?.order ?? null,
    payment:
      current?.payment && current.payment.orderId === id
        ? current.payment
        : null,
    accessToken: token,
  });
}

/** Preview-only capability token for the cookie-backed draft order. */
export async function readPreviewOrderAccessToken(
  orderId?: string | null,
): Promise<string | null> {
  if (!isPreviewTestCatalogEnabled()) return null;
  const snapshot = await readPreviewCommerceSnapshot();
  const token = snapshot?.accessToken?.trim() || null;
  if (!token) return null;
  if (orderId && snapshot?.order && snapshot.order.id !== orderId.trim()) {
    return null;
  }
  return token;
}

export async function clearPreviewCommerceCookie(): Promise<void> {
  const store = await cookieStore();
  store?.delete(PREVIEW_COMMERCE_COOKIE_NAME);
}
