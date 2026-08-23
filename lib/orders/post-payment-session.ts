/**
 * Client helpers for post-payment confirmation URL + durable reopen.
 */

export function buildOrderConfirmationPath(input: {
  orderId: string;
  accessToken?: string | null;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = input.accessToken?.trim();
  if (!token) return `/order-confirmation?orderId=${orderId}`;
  return `/order-confirmation?orderId=${orderId}&token=${encodeURIComponent(token)}`;
}

export function buildOrderCompletedPath(input: {
  orderId: string;
  accessToken?: string | null;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = input.accessToken?.trim();
  if (!token) return `/order-completed/${orderId}`;
  return `/order-completed/${orderId}?token=${encodeURIComponent(token)}`;
}

export function buildOrderReceiptPath(input: {
  orderId: string;
  accessToken?: string | null;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = input.accessToken?.trim();
  if (!token) return `/order-completed/${orderId}/receipt`;
  return `/order-completed/${orderId}/receipt?token=${encodeURIComponent(token)}`;
}
