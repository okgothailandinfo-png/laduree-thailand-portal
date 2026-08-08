/**
 * Client helpers for post-payment confirmation URL + durable reopen.
 */

export function buildOrderConfirmationPath(input: {
  orderId: string;
  accessToken: string;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = encodeURIComponent(input.accessToken.trim());
  return `/order-confirmation?orderId=${orderId}&token=${token}`;
}

export function buildOrderCompletedPath(input: {
  orderId: string;
  accessToken: string;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = encodeURIComponent(input.accessToken.trim());
  return `/order-completed/${orderId}?token=${token}`;
}

export function buildOrderReceiptPath(input: {
  orderId: string;
  accessToken: string;
}): string {
  const orderId = encodeURIComponent(input.orderId.trim());
  const token = encodeURIComponent(input.accessToken.trim());
  return `/order-completed/${orderId}/receipt?token=${token}`;
}
