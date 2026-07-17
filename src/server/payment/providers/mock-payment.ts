import { randomUUID } from "crypto";
import type { Payment } from "@/src/server/models/payment";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecordDto,
  PaymentStatus,
} from "@/src/server/payment/dto";
import type { PaymentProvider } from "@/src/server/payment/interfaces";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import { AppError } from "@/src/server/utils/errors";

function toDto(payment: Payment): PaymentRecordDto {
  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    status: payment.status,
    paymentUrl: payment.paymentUrl,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly payments: PaymentRepository) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const paymentId = randomUUID();
    const now = new Date().toISOString();
    const paymentUrl = `/payment/mock?paymentId=${encodeURIComponent(paymentId)}`;
    const record: Payment = {
      paymentId,
      orderId: input.orderId,
      status: "PENDING",
      paymentUrl,
      createdAt: now,
      updatedAt: now,
    };
    await this.payments.save(record);
    return {
      paymentId: record.paymentId,
      paymentUrl: record.paymentUrl,
      status: "PENDING",
    };
  }

  async getPayment(paymentId: string): Promise<PaymentRecordDto> {
    return toDto(await this.requirePayment(paymentId));
  }

  async confirmPayment(
    paymentId: string,
    result: Extract<PaymentStatus, "SUCCESS" | "FAILED">,
  ): Promise<PaymentRecordDto> {
    const current = await this.requirePayment(paymentId);
    if (current.status !== "PENDING") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only pending payments can be confirmed.",
        { details: { field: "paymentId", status: current.status } },
      );
    }
    return toDto(await this.setStatus(current, result));
  }

  async cancelPayment(paymentId: string): Promise<PaymentRecordDto> {
    const current = await this.requirePayment(paymentId);
    return toDto(await this.setStatus(current, "CANCELLED"));
  }

  async refundPayment(paymentId: string): Promise<PaymentRecordDto> {
    const current = await this.requirePayment(paymentId);
    if (current.status !== "SUCCESS") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only successful payments can be refunded.",
        { details: { field: "paymentId", status: current.status } },
      );
    }
    return toDto(await this.setStatus(current, "REFUNDED"));
  }

  async applyStatus(
    paymentId: string,
    status: PaymentStatus,
  ): Promise<PaymentRecordDto> {
    const current = await this.requirePayment(paymentId);
    if (current.status === status) {
      return toDto(current);
    }
    return toDto(await this.setStatus(current, status));
  }

  private async setStatus(
    current: Payment,
    status: PaymentStatus,
  ): Promise<Payment> {
    const next: Payment = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };
    return this.payments.save(next);
  }

  private async requirePayment(paymentId: string): Promise<Payment> {
    const record = await this.payments.findById(paymentId);
    if (!record) {
      throw new AppError("NOT_FOUND", `Payment not found: ${paymentId}`);
    }
    return record;
  }
}
