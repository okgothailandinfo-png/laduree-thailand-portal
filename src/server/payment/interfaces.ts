import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecordDto,
  PaymentStatus,
} from "@/src/server/payment/dto";

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(paymentId: string): Promise<PaymentRecordDto>;
  confirmPayment(
    paymentId: string,
    result: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
  ): Promise<PaymentRecordDto>;
  cancelPayment(paymentId: string): Promise<PaymentRecordDto>;
  refundPayment(paymentId: string): Promise<PaymentRecordDto>;
}
