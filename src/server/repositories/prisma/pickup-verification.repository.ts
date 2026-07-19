import { Prisma, type PickupVerification as PrismaPickupVerification } from "@prisma/client";
import type { PickupVerificationRecord } from "@/src/server/models/pickup-verification";
import type {
  CompletePickupHandoffInput,
  CompletePickupHandoffResult,
  CreatePickupVerificationInput,
  MarkVerifiedInput,
  PickupVerificationRepository,
} from "@/src/server/pickup/pickup-verification.repository";
import {
  toDomainOrder,
  type PrismaOrderWithRelations,
} from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";

const orderInclude = {
  customer: true,
  boutique: true,
  pickupSlot: true,
  items: true,
  payment: true,
} satisfies Prisma.OrderInclude;

function toRecord(row: PrismaPickupVerification): PickupVerificationRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    pickupCodeHash: row.pickupCodeHash,
    tokenHash: row.tokenHash,
    customerRevealCipher: row.customerRevealCipher,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    verifiedBy: row.verifiedBy,
    verificationAttempts: row.verificationAttempts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaPickupVerificationRepository
  implements PickupVerificationRepository
{
  async findByOrderId(
    orderId: string,
  ): Promise<PickupVerificationRecord | null> {
    const row = await prisma.pickupVerification.findUnique({
      where: { orderId },
    });
    return row ? toRecord(row) : null;
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PickupVerificationRecord | null> {
    const row = await prisma.pickupVerification.findUnique({
      where: { tokenHash },
    });
    return row ? toRecord(row) : null;
  }

  async findByPickupCodeHash(
    pickupCodeHash: string,
  ): Promise<PickupVerificationRecord | null> {
    const row = await prisma.pickupVerification.findUnique({
      where: { pickupCodeHash },
    });
    return row ? toRecord(row) : null;
  }

  async create(
    input: CreatePickupVerificationInput,
  ): Promise<PickupVerificationRecord> {
    const row = await prisma.pickupVerification.create({
      data: {
        orderId: input.orderId,
        pickupCodeHash: input.pickupCodeHash,
        tokenHash: input.tokenHash,
        customerRevealCipher: input.customerRevealCipher,
        expiresAt: input.expiresAt ?? null,
      },
    });
    return toRecord(row);
  }

  async upsertForOrder(
    input: CreatePickupVerificationInput,
  ): Promise<PickupVerificationRecord> {
    const row = await prisma.pickupVerification.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        pickupCodeHash: input.pickupCodeHash,
        tokenHash: input.tokenHash,
        customerRevealCipher: input.customerRevealCipher,
        expiresAt: input.expiresAt ?? null,
      },
      update: {
        pickupCodeHash: input.pickupCodeHash,
        tokenHash: input.tokenHash,
        customerRevealCipher: input.customerRevealCipher,
        expiresAt: input.expiresAt ?? null,
        verifiedAt: null,
        verifiedBy: null,
        verificationAttempts: 0,
      },
    });
    return toRecord(row);
  }

  async incrementAttempts(id: string): Promise<PickupVerificationRecord> {
    try {
      const row = await prisma.pickupVerification.update({
        where: { id },
        data: { verificationAttempts: { increment: 1 } },
      });
      return toRecord(row);
    } catch {
      throw new AppError("NOT_FOUND", "Pickup verification not found.");
    }
  }

  async markVerified(
    input: MarkVerifiedInput,
  ): Promise<PickupVerificationRecord> {
    const row = await prisma.pickupVerification.update({
      where: { id: input.verificationId },
      data: {
        verifiedAt: input.verifiedAt ?? new Date(),
        verifiedBy: input.verifiedBy,
      },
    });
    return toRecord(row);
  }

  async completeHandoff(
    input: CompletePickupHandoffInput,
  ): Promise<CompletePickupHandoffResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: input.orderId },
          include: orderInclude,
        });
        if (!order) {
          throw new AppError("NOT_FOUND", `Order not found: ${input.orderId}`);
        }

        const verification = await tx.pickupVerification.findUnique({
          where: { id: input.verificationId },
        });
        if (!verification || verification.orderId !== input.orderId) {
          throw new AppError(
            "CONFLICT",
            "Pickup verification does not match this order.",
          );
        }

        // Idempotent: already completed with this verification.
        if (
          order.status === "COMPLETED" &&
          verification.verifiedAt !== null
        ) {
          return {
            order: toDomainOrder(order as PrismaOrderWithRelations),
            verification: toRecord(verification),
            alreadyCompleted: true,
          };
        }

        if (order.status === "COMPLETED") {
          throw new AppError(
            "CONFLICT",
            "Order is already completed.",
            { details: { orderId: input.orderId } },
          );
        }

        if (order.status !== "READY_FOR_PICKUP") {
          throw new AppError(
            "CONFLICT",
            "Order is not ready for pickup.",
            {
              details: {
                current: order.status,
                expected: "READY_FOR_PICKUP",
              },
            },
          );
        }

        if (input.expectedStatus !== "ready_for_pickup") {
          throw new AppError(
            "VALIDATION_ERROR",
            'expectedStatus must be "ready_for_pickup".',
          );
        }

        if (verification.verifiedAt) {
          // Verified earlier but order not completed — allow completion.
        }

        const now = new Date();
        const updatedVerification = await tx.pickupVerification.update({
          where: { id: input.verificationId },
          data: {
            verifiedAt: verification.verifiedAt ?? now,
            verifiedBy: verification.verifiedBy ?? input.verifiedBy,
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: input.orderId },
          data: { status: "COMPLETED" },
          include: orderInclude,
        });

        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            fromStatus: "READY_FOR_PICKUP",
            toStatus: "COMPLETED",
            note: input.note?.trim() || "Pickup verified and handed off.",
            changedBy: input.verifiedBy,
          },
        });

        return {
          order: toDomainOrder(updatedOrder as PrismaOrderWithRelations),
          verification: toRecord(updatedVerification),
          alreadyCompleted: false,
        };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw error;
    }
  }
}
