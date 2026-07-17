import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecordDto,
  PaymentStatus,
} from "@/src/server/payment/dto";

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(paymentId: string): Promise<PaymentRecordDto>;
  cancelPayment(paymentId: string): Promise<PaymentRecordDto>;
  refundPayment(paymentId: string): Promise<PaymentRecordDto>;
  /**
   * Mock / test-only settlement. Real gateways use webhooks instead.
   * Optional so future providers do not need to implement it.
   */
  settlePayment?(
    paymentId: string,
    status: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
  ): Promise<PaymentRecordDto>;
}
