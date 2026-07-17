import { apiMutate } from "@/lib/api/client";
import type { CheckoutRequest, CheckoutResponse } from "@/lib/api/types";

export function submitCheckout(input: CheckoutRequest, init?: RequestInit) {
  return apiMutate<CheckoutResponse>("/api/checkout", "POST", input, init);
}
