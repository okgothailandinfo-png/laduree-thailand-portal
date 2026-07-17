import type {
  CreatePaymentRequestDto,
  CreatePaymentResult,
  PaymentRecordDto,
} from "@/src/server/payment/dto";
import { createPaymentProvider } from "@/src/server/payment/factory";
import type { PaymentProvider } from "@/src/server/payment/interfaces";
import type { OrderService } from "@/src/server/services/interfaces";
import { AppError } from "@/src/server/utils/errors";
import {
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

export class PaymentService {
  private readonly provider: PaymentProvider;

  constructor(
    private readonly orders: OrderService,
    provider?: PaymentProvider,
  ) {
    this.provider = provider ?? createPaymentProvider("mock");
  }

  parseCreatePaymentBody(raw: unknown): CreatePaymentRequestDto {
    const body = requireObject(raw, "body");
    return {
      orderId: requireString(body.orderId, "orderId"),
    };
  }

  async createPayment(orderId: string): Promise<CreatePaymentResult> {
    const id = requireString(orderId, "orderId");
    // Ensures the draft/order exists before starting payment.
    await this.orders.getOrderById(id);
    return this.provider.createPayment({ orderId: id });
  }

  async getPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.getPayment(requireString(paymentId, "paymentId"));
  }

  async cancelPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.cancelPayment(requireString(paymentId, "paymentId"));
  }

  async refundPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.provider.refundPayment(requireString(paymentId, "paymentId"));
  }

  /** Mock settlement path used by /payment/mock Success & Fail actions. */
  async settleMockPayment(
    paymentId: string,
    status: "SUCCESS" | "FAILED",
  ): Promise<PaymentRecordDto> {
    const id = requireString(paymentId, "paymentId");
    if (!this.provider.settlePayment) {
      throw new AppError(
        "BAD_REQUEST",
        "Payment settlement is only available on the mock provider.",
      );
    }
    return this.provider.settlePayment(id, status);
  }
}
