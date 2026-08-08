import { apiGet, apiMutate } from "@/lib/api/client";
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentRecord,
} from "@/lib/api/types";

export function createPayment(
  input: CreatePaymentRequest,
  init?: RequestInit & { idempotencyKey?: string },
) {
  const { idempotencyKey, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  return apiMutate<CreatePaymentResponse>(
    "/api/payment/create",
    "POST",
    input,
    {
      ...rest,
      headers,
    },
  );
}

export function confirmPayment(
  input: ConfirmPaymentRequest,
  init?: RequestInit,
) {
  return apiMutate<ConfirmPaymentResponse>(
    "/api/payment/confirm",
    "POST",
    input,
    init,
  );
}

export function fetchPayment(paymentId: string, init?: RequestInit) {
  return apiGet<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}`,
    init,
  );
}

export function cancelPayment(paymentId: string, init?: RequestInit) {
  return apiMutate<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}/cancel`,
    "POST",
    undefined,
    init,
  );
}

export function refundPayment(paymentId: string, init?: RequestInit) {
  return apiMutate<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}/refund`,
    "POST",
    undefined,
    init,
  );
}
