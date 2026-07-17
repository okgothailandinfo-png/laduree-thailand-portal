import { apiGet, apiMutate } from "@/lib/api/client";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentRecord,
} from "@/lib/api/types";

export function createPayment(input: CreatePaymentRequest, init?: RequestInit) {
  return apiMutate<CreatePaymentResponse>("/api/payment", "POST", input, init);
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

export function settleMockPaymentSuccess(
  paymentId: string,
  init?: RequestInit,
) {
  return apiMutate<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}/success`,
    "POST",
    undefined,
    init,
  );
}

export function settleMockPaymentFail(paymentId: string, init?: RequestInit) {
  return apiMutate<PaymentRecord>(
    `/api/payment/${encodeURIComponent(paymentId)}/fail`,
    "POST",
    undefined,
    init,
  );
}
