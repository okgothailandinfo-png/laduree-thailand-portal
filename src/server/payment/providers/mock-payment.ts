import { randomUUID } from "crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecordDto,
  PaymentStatus,
} from "@/src/server/payment/dto";
import type { PaymentProvider } from "@/src/server/payment/interfaces";
import { AppError } from "@/src/server/utils/errors";

type StoredPayment = PaymentRecordDto;

const paymentsById = new Map<string, StoredPayment>();

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const paymentId = randomUUID();
    const now = new Date().toISOString();
    const record: StoredPayment = {
      paymentId,
      orderId: input.orderId,
      status: "PENDING",
      redirectUrl: `/payment/mock?paymentId=${encodeURIComponent(paymentId)}`,
      createdAt: now,
      updatedAt: now,
    };
    paymentsById.set(paymentId, record);
    return {
      paymentId: record.paymentId,
      status: "PENDING",
      redirectUrl: record.redirectUrl,
    };
  }

  async getPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.requirePayment(paymentId);
  }

  async cancelPayment(paymentId: string): Promise<PaymentRecordDto> {
    return this.setStatus(paymentId, "CANCELLED");
  }

  async refundPayment(paymentId: string): Promise<PaymentRecordDto> {
    const current = this.requirePayment(paymentId);
    if (current.status !== "SUCCESS") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only successful payments can be refunded.",
        { details: { field: "paymentId", status: current.status } },
      );
    }
    return this.setStatus(paymentId, "REFUNDED");
  }

  async settlePayment(
    paymentId: string,
    status: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
  ): Promise<PaymentRecordDto> {
    const current = this.requirePayment(paymentId);
    if (current.status !== "PENDING") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only pending payments can be settled.",
        { details: { field: "paymentId", status: current.status } },
      );
    }
    return this.setStatus(paymentId, status);
  }

  private setStatus(
    paymentId: string,
    status: PaymentStatus,
  ): PaymentRecordDto {
    const current = this.requirePayment(paymentId);
    const next: StoredPayment = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };
    paymentsById.set(paymentId, next);
    return { ...next };
  }

  private requirePayment(paymentId: string): StoredPayment {
    const record = paymentsById.get(paymentId);
    if (!record) {
      throw new AppError("NOT_FOUND", `Payment not found: ${paymentId}`);
    }
    return record;
  }
}
