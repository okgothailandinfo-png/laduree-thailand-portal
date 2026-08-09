import { apiGet, apiMutate } from "@/lib/api/client";
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentRecord,
} from "@/lib/api/types";

function withAccessTokenHeaders(
  accessToken: string | null | undefined,
  init?: RequestInit,
): Headers {
  const headers = new Headers(init?.headers);
  const token = accessToken?.trim();
  if (token) {
    headers.set("X-Order-Access-Token", token);
  }
  return headers;
}

export function createPayment(
  input: CreatePaymentRequest,
  init?: RequestInit & { idempotencyKey?: string; accessToken?: string | null },
) {
  const { idempotencyKey, accessToken, ...rest } = init ?? {};
  const headers = withAccessTokenHeaders(
    accessToken ?? input.accessToken,
    rest,
  );
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  return apiMutate<CreatePaymentResponse>(
    "/api/payment/create",
    "POST",
    {
      ...input,
      ...(accessToken?.trim()
        ? { accessToken: accessToken.trim() }
        : {}),
    },
    {
      ...rest,
      headers,
    },
  );
}

export function confirmPayment(
  input: ConfirmPaymentRequest,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiMutate<ConfirmPaymentResponse>(
    "/api/payment/confirm",
    "POST",
    input,
    {
      ...rest,
      headers: withAccessTokenHeaders(accessToken, rest),
    },
  );
}

export function fetchPayment(
  paymentId: string,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiGet<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}`,
    {
      ...rest,
      headers: withAccessTokenHeaders(accessToken, rest),
    },
  );
}

export function cancelPayment(
  paymentId: string,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiMutate<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}/cancel`,
    "POST",
    undefined,
    {
      ...rest,
      headers: withAccessTokenHeaders(accessToken, rest),
    },
  );
}

export function refundPayment(
  paymentId: string,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiMutate<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}/refund`,
    "POST",
    undefined,
    {
      ...rest,
      headers: withAccessTokenHeaders(accessToken, rest),
    },
  );
}
