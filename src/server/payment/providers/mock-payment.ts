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
import {
  PAYMENT_METHOD_LABELS,
} from "@/lib/payment/methods";

const TERMINAL_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
]);

function toDto(payment: Payment): PaymentRecordDto {
  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    status: payment.status,
    paymentUrl: payment.paymentUrl,
    method: payment.method,
    methodLabel: payment.methodLabel,
    safeDisplay: payment.safeDisplay,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function canTransition(
  current: PaymentStatus,
  next: PaymentStatus,
): boolean {
  if (current === next) return true;
  if (current === "PENDING") return true;
  if (current === "SUCCESS" && next === "REFUNDED") return true;
  return false;
}

export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly payments: PaymentRepository) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const paymentId = randomUUID();
    const now = new Date().toISOString();
    const paymentUrl = `/payment/mock?paymentId=${encodeURIComponent(paymentId)}`;
    const methodLabel = PAYMENT_METHOD_LABELS[input.method];
    const record: Payment = {
      paymentId,
      orderId: input.orderId,
      status: "PENDING",
      paymentUrl,
      method: input.method,
      methodLabel,
      safeDisplay: input.safeDisplay?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    // Exclusive PENDING create — concurrent same-order creates reuse one row.
    const { payment } = await this.payments.savePendingExclusive(record);
    return {
      paymentId: payment.paymentId,
      paymentUrl: payment.paymentUrl,
      status: "PENDING",
      method: payment.method,
      methodLabel: payment.methodLabel,
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
    // Idempotent: repeating the same terminal confirm returns the current record.
    if (current.status === result) {
      return toDto(current);
    }
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
    if (current.status === "CANCELLED") {
      return toDto(current);
    }
    if (current.status !== "PENDING") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only pending payments can be cancelled.",
        { details: { field: "paymentId", status: current.status } },
      );
    }
    return toDto(await this.setStatus(current, "CANCELLED"));
  }

  async refundPayment(paymentId: string): Promise<PaymentRecordDto> {
    const current = await this.requirePayment(paymentId);
    if (current.status === "REFUNDED") {
      return toDto(current);
    }
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
    if (!canTransition(current.status, status)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Cannot transition payment from ${current.status} to ${status}.`,
        {
          details: {
            field: "paymentId",
            status: current.status,
            nextStatus: status,
            terminal: TERMINAL_STATUSES.has(current.status),
          },
        },
      );
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
      throw new AppError("NOT_FOUND", "Payment not found.");
    }
    return record;
  }
}
