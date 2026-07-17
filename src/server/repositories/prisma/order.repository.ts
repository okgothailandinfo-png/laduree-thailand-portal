import { Prisma } from "@prisma/client";
import type { Order } from "@/src/server/models/order";
import type { OrderRepository } from "@/src/server/repositories/interfaces";
import {
  toDomainOrder,
  toPrismaPaymentMethod,
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

export class PrismaOrderRepository implements OrderRepository {
  async create(order: Order): Promise<Order> {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: {
            email_mobileNumber: {
              email: order.customer.email,
              mobileNumber: order.customer.mobileNumber,
            },
          },
          create: {
            customerName: order.customer.customerName,
            mobileNumber: order.customer.mobileNumber,
            email: order.customer.email,
            recipientName: order.customer.recipientName,
            recipientPhone: order.customer.recipientPhone,
          },
          update: {
            customerName: order.customer.customerName,
            recipientName: order.customer.recipientName,
            recipientPhone: order.customer.recipientPhone,
          },
        });

        const saved = await tx.order.create({
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status === "pending" ? "PENDING" : "PLACED",
            customerId: customer.id,
            boutiqueId: order.pickup.boutiqueId,
            pickupSlotId: order.pickup.timeSlotId,
            currency: "THB",
            totalMinor: order.totalMinor,
            specialRequest: order.customer.specialRequest,
            termsAccepted: order.termsAccepted,
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity,
                unitPriceMinor: item.unitPriceMinor,
                currency: "THB",
                modifiers: item.modifiers as Prisma.InputJsonValue,
                note: item.note,
              })),
            },
            ...(order.payment
              ? {
                  payment: {
                    create: {
                      method: toPrismaPaymentMethod(order.payment.method),
                      status: "MOCK_ACCEPTED",
                      amountMinor: order.totalMinor,
                      currency: "THB",
                    },
                  },
                }
              : {}),
          },
          include: orderInclude,
        });

        return saved;
      });

      return toDomainOrder(created as PrismaOrderWithRelations);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Order references an unknown product, boutique, or pickup slot.",
          { details: error.meta },
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Order | null> {
    const row = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    return row ? toDomainOrder(row as PrismaOrderWithRelations) : null;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const row = await prisma.order.findUnique({
      where: { orderNumber },
      include: orderInclude,
    });
    return row ? toDomainOrder(row as PrismaOrderWithRelations) : null;
  }
}
