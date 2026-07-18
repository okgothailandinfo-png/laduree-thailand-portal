import { Prisma } from "@prisma/client";
import type { AdminOrderListQuery } from "@/src/server/admin/dto";
import type { Order, OrderStatus } from "@/src/server/models/order";
import type {
  AdminOrderDetailRecord,
  AdminOrderListPage,
  OrderRepository,
  OrderStatusUpdateOptions,
} from "@/src/server/repositories/interfaces";
import {
  toAdminPaymentStatus,
  toDomainOrder,
  toDomainOrderHistory,
  toPrismaOrderStatus,
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

const orderDetailInclude = {
  ...orderInclude,
  history: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

function bangkokDayBounds(dateKey: string): { start: Date; end: Date } {
  // dateKey is YYYY-MM-DD in Asia/Bangkok calendar sense for filters.
  const start = new Date(`${dateKey}T00:00:00.000+07:00`);
  const end = new Date(`${dateKey}T23:59:59.999+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError("VALIDATION_ERROR", "Invalid date filter.", {
      details: { dateKey },
    });
  }
  return { start, end };
}

function buildAdminWhere(
  query: AdminOrderListQuery,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (query.search?.trim()) {
    const term = query.search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customer: { customerName: { contains: term, mode: "insensitive" } } },
      { customer: { email: { contains: term, mode: "insensitive" } } },
      { customer: { mobileNumber: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (query.status) {
    where.status = toPrismaOrderStatus(query.status);
  }

  if (query.boutiqueId) {
    where.boutiqueId = query.boutiqueId;
  }

  if (query.paymentStatus) {
    if (query.paymentStatus === "pending") {
      where.payment = { status: "PENDING" };
    } else if (query.paymentStatus === "mock_accepted") {
      where.payment = { status: "MOCK_ACCEPTED" };
    } else if (query.paymentStatus === "failed") {
      where.payment = { status: "FAILED" };
    }
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) {
      where.createdAt.gte = bangkokDayBounds(query.dateFrom).start;
    }
    if (query.dateTo) {
      where.createdAt.lte = bangkokDayBounds(query.dateTo).end;
    }
  }

  return where;
}

function toListRow(row: PrismaOrderWithRelations) {
  const order = toDomainOrder(row);
  return {
    order,
    boutiqueCode: row.boutique.code,
    pickupStartTime: row.pickupSlot.startTime,
    paymentStatus: toAdminPaymentStatus(row.payment),
    paymentId: row.payment?.id ?? null,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: row.updatedAt.toISOString(),
  };
}

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
            status: toPrismaOrderStatus(order.status),
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

  async updateStatus(
    id: string,
    status: OrderStatus,
    options?: OrderStatusUpdateOptions,
  ): Promise<Order> {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({
          where: { id },
          include: orderInclude,
        });
        if (!existing) {
          throw new AppError("NOT_FOUND", `Order not found: ${id}`);
        }

        const fromPrisma = existing.status;
        const toPrisma = toPrismaOrderStatus(status);

        // Idempotent: same status → no history write.
        if (fromPrisma === toPrisma) {
          return existing;
        }

        const row = await tx.order.update({
          where: { id },
          data: { status: toPrisma },
          include: orderInclude,
        });

        await tx.orderHistory.create({
          data: {
            orderId: id,
            fromStatus: fromPrisma,
            toStatus: toPrisma,
            note: options?.note?.trim() || null,
            changedBy: options?.changedBy?.trim() || null,
          },
        });

        return row;
      });

      return toDomainOrder(updated as PrismaOrderWithRelations);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Order not found: ${id}`);
      }
      throw error;
    }
  }

  async adminList(query: AdminOrderListQuery): Promise<AdminOrderListPage> {
    const where = buildAdminWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [total, rows] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => toListRow(row as PrismaOrderWithRelations)),
    };
  }

  async adminFindById(id: string): Promise<AdminOrderDetailRecord | null> {
    const row = await prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
    if (!row) return null;

    const list = toListRow(row as PrismaOrderWithRelations);
    return {
      order: list.order,
      boutiqueCode: list.boutiqueCode,
      pickupStartTime: list.pickupStartTime,
      paymentStatus: list.paymentStatus,
      paymentId: list.paymentId,
      updatedAt: list.updatedAt,
      history: (row.history ?? []).map(toDomainOrderHistory),
    };
  }
}
