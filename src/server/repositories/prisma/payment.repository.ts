import type { GatewayPaymentStatus, Prisma } from "@prisma/client";
import type { Payment } from "@/src/server/models/payment";
import type { PaymentStatus } from "@/src/server/payment/dto";
import { isPrismaUniqueViolation } from "@/src/server/payment/webhook-claim";
import type {
  PaymentRepository,
  SavePendingExclusiveResult,
} from "@/src/server/repositories/payment.repository";
import { prisma } from "@/src/server/database/prisma";
import type { CreateOrderPaymentDto } from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";

function toDomainStatus(status: GatewayPaymentStatus): PaymentStatus {
  return status;
}

function toPrismaStatus(status: PaymentStatus): GatewayPaymentStatus {
  return status;
}

function toDomain(row: {
  paymentId: string;
  orderId: string;
  status: GatewayPaymentStatus;
  paymentUrl: string;
  method: string;
  methodLabel: string;
  safeDisplay: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Payment {
  return {
    paymentId: row.paymentId,
    orderId: row.orderId,
    status: toDomainStatus(row.status),
    paymentUrl: row.paymentUrl,
    method: row.method as CreateOrderPaymentDto["method"],
    methodLabel: row.methodLabel,
    safeDisplay: row.safeDisplay,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaPaymentRepository implements PaymentRepository {
  async findById(paymentId: string): Promise<Payment | null> {
    const row = await prisma.gatewayPayment.findUnique({
      where: { paymentId },
    });
    return row ? toDomain(row) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const pending = await this.findPendingByOrderId(orderId);
    if (pending) return pending;
    const row = await prisma.gatewayPayment.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toDomain(row) : null;
  }

  async findPendingByOrderId(orderId: string): Promise<Payment | null> {
    const row = await prisma.gatewayPayment.findFirst({
      where: { orderId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    return row ? toDomain(row) : null;
  }

  async save(payment: Payment): Promise<Payment> {
    const data: Prisma.GatewayPaymentUncheckedCreateInput = {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: toPrismaStatus(payment.status),
      paymentUrl: payment.paymentUrl,
      method: payment.method,
      methodLabel: payment.methodLabel,
      safeDisplay: payment.safeDisplay,
      provider: "mock",
    };
    const row = await prisma.gatewayPayment.upsert({
      where: { paymentId: payment.paymentId },
      create: data,
      update: {
        orderId: data.orderId,
        status: data.status,
        paymentUrl: data.paymentUrl,
        method: data.method,
        methodLabel: data.methodLabel,
        safeDisplay: data.safeDisplay,
      },
    });
    return toDomain(row);
  }

  async savePendingExclusive(
    payment: Payment,
  ): Promise<SavePendingExclusiveResult> {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existing = await tx.gatewayPayment.findFirst({
            where: { orderId: payment.orderId, status: "PENDING" },
            orderBy: { createdAt: "desc" },
          });
          if (existing) {
            if (existing.method === payment.method) {
              return { payment: toDomain(existing), reused: true };
            }
            await tx.gatewayPayment.update({
              where: { paymentId: existing.paymentId },
              data: { status: "CANCELLED" },
            });
          }

          const data: Prisma.GatewayPaymentUncheckedCreateInput = {
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            status: "PENDING",
            paymentUrl: payment.paymentUrl,
            method: payment.method,
            methodLabel: payment.methodLabel,
            safeDisplay: payment.safeDisplay,
            provider: "mock",
          };
          const row = await tx.gatewayPayment.create({ data });
          return { payment: toDomain(row), reused: false };
        });
      } catch (error) {
        if (!isPrismaUniqueViolation(error)) throw error;
        // Another instance won the partial unique PENDING index — reuse or retry.
        const existing = await this.findPendingByOrderId(payment.orderId);
        if (existing && existing.method === payment.method) {
          return { payment: existing, reused: true };
        }
        if (existing && existing.method !== payment.method) {
          await this.save({
            ...existing,
            status: "CANCELLED",
            updatedAt: new Date().toISOString(),
          });
          continue;
        }
      }
    }

    const fallback = await this.findPendingByOrderId(payment.orderId);
    if (fallback && fallback.method === payment.method) {
      return { payment: fallback, reused: true };
    }

    throw new AppError(
      "CONFLICT",
      "Unable to create an exclusive pending payment for this order.",
      { status: 409 },
    );
  }
}
