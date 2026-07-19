import { apiMutate } from "@/lib/api/client";
import type { CheckoutRequest, CheckoutResponse } from "@/lib/api/types";

export function submitCheckout(
  input: CheckoutRequest,
  init?: RequestInit & { idempotencyKey?: string },
) {
  const { idempotencyKey, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  return apiMutate<CheckoutResponse>("/api/checkout", "POST", input, {
    ...rest,
    headers,
  });
}
