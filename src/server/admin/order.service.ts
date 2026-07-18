import type {
  AdminOrderDetailDto,
  AdminOrderItemDto,
  AdminOrderListItemDto,
  AdminOrderListQuery,
  AdminOrderListResult,
  AdminOrderStatus,
  AdminUpdateOrderStatusInput,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type { Boutique } from "@/src/server/models/boutique";
import type { Order, OrderStatus } from "@/src/server/models/order";
import {
  assertValidStatusTransition,
  getAllowedNextStatuses,
} from "@/src/server/orders/status-transitions";
import type {
  AdminOrderDetailRecord,
  AdminOrderListRow,
  BoutiqueRepository,
  OrderRepository,
} from "@/src/server/repositories/interfaces";
import { paymentMethodLabel } from "@/src/server/repositories/prisma/mappers";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  optionalString,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

const ORDER_STATUSES: readonly AdminOrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "mock_placed",
] as const;

const PAYMENT_STATUSES = ["pending", "mock_accepted", "failed"] as const;

function minorToThb(minor: number): number {
  return minor / 100;
}

function parsePositiveInt(
  value: string | null,
  field: string,
  fallback: number,
): number {
  if (value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a positive integer.`, {
      details: { field },
    });
  }
  return parsed;
}

function parseOptionalDateKey(
  value: string | null,
  field: string,
): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be YYYY-MM-DD.`,
      { details: { field } },
    );
  }
  return trimmed;
}

function parseOrderStatus(value: unknown, field: string): AdminOrderStatus {
  const status = requireString(value, field);
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new AppError("VALIDATION_ERROR", `Invalid ${field}.`, {
      details: { field, allowed: ORDER_STATUSES },
    });
  }
  return status as AdminOrderStatus;
}

function toListItem(row: AdminOrderListRow): AdminOrderListItemDto {
  const { order } = row;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.customerName,
    customerEmail: order.customer.email,
    customerPhone: order.customer.mobileNumber,
    boutiqueId: order.pickup.boutiqueId,
    boutiqueName: order.pickup.boutiqueName,
    pickupDate: order.pickup.dateKey,
    pickupTime: order.pickup.timeSlotLabel || row.pickupStartTime,
    itemCount: row.itemCount,
    currency: "THB",
    totalMinor: order.totalMinor,
    totalThb: minorToThb(order.totalMinor),
    paymentStatus: row.paymentStatus,
    orderStatus: order.status,
    createdAt: order.createdAt,
  };
}

function toItemDto(item: Order["items"][number]): AdminOrderItemDto {
  const lineTotalMinor = item.unitPriceMinor * item.quantity;
  return {
    productId: item.productId,
    productName: item.name,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    unitPriceThb: minorToThb(item.unitPriceMinor),
    lineTotalMinor,
    lineTotalThb: minorToThb(lineTotalMinor),
    currency: "THB",
    modifiers: item.modifiers,
    note: item.note ?? null,
  };
}

function toDetail(record: AdminOrderDetailRecord): AdminOrderDetailDto {
  const { order } = record;
  const items = order.items.map(toItemDto);
  const subtotalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    allowedNextStatuses: [...getAllowedNextStatuses(order.status)],
    paymentStatus: record.paymentStatus,
    paymentMethod: order.payment?.method ?? null,
    paymentMethodLabel: order.payment
      ? paymentMethodLabel(order.payment.method)
      : null,
    paymentReference: record.paymentId,
    customer: {
      name: order.customer.customerName,
      email: order.customer.email,
      phone: order.customer.mobileNumber,
      recipientName: order.customer.recipientName ?? null,
      recipientPhone: order.customer.recipientPhone ?? null,
    },
    boutique: {
      id: order.pickup.boutiqueId,
      name: order.pickup.boutiqueName,
      code: record.boutiqueCode,
      address: order.pickup.address,
    },
    pickup: {
      date: order.pickup.dateKey,
      time: order.pickup.timeSlotLabel || record.pickupStartTime,
      slotId: order.pickup.timeSlotId,
    },
    items,
    notes: order.customer.specialRequest ?? null,
    subtotalMinor,
    subtotalThb: minorToThb(subtotalMinor),
    taxMinor: null,
    taxThb: null,
    totalMinor: order.totalMinor,
    totalThb: minorToThb(order.totalMinor),
    currency: "THB",
    createdAt: order.createdAt,
    updatedAt: record.updatedAt,
    history: record.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      changedBy: entry.changedBy,
      createdAt: entry.createdAt,
    })),
  };
}

export class AdminOrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly boutiques: BoutiqueRepository,
  ) {}

  parseListQuery(searchParams: URLSearchParams): AdminOrderListQuery {
    const search = searchParams.get("search")?.trim() || undefined;
    const statusRaw = searchParams.get("status");
    const paymentRaw = searchParams.get("paymentStatus");
    const boutiqueId = searchParams.get("boutiqueId")?.trim() || undefined;
    const dateFrom = parseOptionalDateKey(
      searchParams.get("dateFrom"),
      "dateFrom",
    );
    const dateTo = parseOptionalDateKey(searchParams.get("dateTo"), "dateTo");
    const page = parsePositiveInt(searchParams.get("page"), "page", 1);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get("pageSize"), "pageSize", 10),
      100,
    );

    let status: AdminOrderStatus | undefined;
    if (statusRaw && statusRaw !== "all") {
      status = parseOrderStatus(statusRaw, "status");
    }

    let paymentStatus: AdminOrderListQuery["paymentStatus"];
    if (paymentRaw && paymentRaw !== "all") {
      if (!(PAYMENT_STATUSES as readonly string[]).includes(paymentRaw)) {
        throw new AppError("VALIDATION_ERROR", "Invalid paymentStatus.", {
          details: { field: "paymentStatus", allowed: PAYMENT_STATUSES },
        });
      }
      paymentStatus = paymentRaw as AdminOrderListQuery["paymentStatus"];
    }

    return {
      search,
      status,
      paymentStatus,
      boutiqueId,
      dateFrom,
      dateTo,
      page,
      pageSize,
    };
  }

  parseUpdateStatusBody(body: unknown): AdminUpdateOrderStatusInput {
    const raw = requireObject(body, "body");
    return {
      status: parseOrderStatus(raw.status, "status"),
      note: optionalString(raw.note, "note") ?? null,
    };
  }

  async list(query: AdminOrderListQuery): Promise<AdminOrderListResult> {
    requirePrismaDataSource();
    const page = await this.orders.adminList(query);
    const totalPages =
      page.total === 0 ? 0 : Math.ceil(page.total / query.pageSize);
    return {
      items: page.items.map(toListItem),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages,
    };
  }

  async getById(id: string): Promise<AdminOrderDetailDto> {
    requirePrismaDataSource();
    const record = await this.orders.adminFindById(id);
    if (!record) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    return toDetail(record);
  }

  async listBoutiques(): Promise<Boutique[]> {
    requirePrismaDataSource();
    return this.boutiques.list();
  }

  async updateStatus(
    id: string,
    input: AdminUpdateOrderStatusInput,
  ): Promise<AdminOrderDetailDto> {
    requirePrismaDataSource();

    const existing = await this.orders.adminFindById(id);
    if (!existing) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }

    const from = existing.order.status;
    const to = input.status as OrderStatus;

    if (from !== to && !getAllowedNextStatuses(from).includes(to)) {
      logger.warn("Invalid order status transition rejected", {
        orderId: id,
        orderNumber: existing.order.orderNumber,
        from,
        to,
      });
      assertValidStatusTransition(from, to);
    }

    // Payment consistency: do not confirm unpaid drafts via admin without payment.
    // CONFIRMED after payment is allowed; PENDING→CONFIRMED is operationally allowed
    // for admin (e.g. paid offline) — payment status remains independent.

    const updated = await this.orders.updateStatus(id, to, {
      note: input.note,
      changedBy: "mock-admin",
    });

    if (from !== to) {
      if (to === "cancelled") {
        logger.info("Order cancelled", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          from,
        });
      } else if (to === "completed") {
        logger.info("Order completed", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          from,
        });
      } else {
        logger.info("Order status changed", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          from,
          to,
        });
      }
    }

    const detail = await this.orders.adminFindById(id);
    if (!detail) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    return toDetail(detail);
  }
}
