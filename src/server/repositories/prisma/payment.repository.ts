import type { GatewayPaymentStatus, Prisma } from "@prisma/client";
import type { Payment } from "@/src/server/models/payment";
import type { PaymentStatus } from "@/src/server/payment/dto";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import { prisma } from "@/src/server/database/prisma";
import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

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
    const row = await prisma.gatewayPayment.findFirst({
      where: { orderId },
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
}
