import type {
  AdminKitchenOrderDto,
  AdminKitchenOrderListQuery,
  AdminKitchenOrderListResult,
  AdminOrderDetailDto,
  AdminOrderItemDto,
  AdminOrderListItemDto,
  AdminOrderListQuery,
  AdminOrderListResult,
  AdminOrderStatus,
  AdminPaymentStatus,
  AdminUpdateOrderPaymentInput,
  AdminUpdateOrderStatusInput,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type { Boutique } from "@/src/server/models/boutique";
import type { Order, OrderStatus } from "@/src/server/models/order";
import {
  assertValidStatusTransition,
  fromAdminWorkflowStatus,
  getAllowedNextStatuses,
  toAdminWorkflowStatus,
} from "@/src/server/orders/status-transitions";
import type { NotificationOrchestrator } from "@/src/server/notifications/orchestrator";
import type { PickupVerificationService } from "@/src/server/pickup/pickup-verification.service";
import type {
  AdminKitchenOrderRow,
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
  "new",
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
  "mock_placed",
] as const;

const PAYMENT_STATUSES = ["pending", "mock_accepted", "failed"] as const;

const PAYMENT_TRANSITIONS: Record<
  Exclude<AdminPaymentStatus, "none">,
  readonly Exclude<AdminPaymentStatus, "none">[]
> = {
  pending: ["mock_accepted", "failed"],
  failed: ["pending", "mock_accepted"],
  mock_accepted: ["failed"],
};

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

function parsePaymentStatus(
  value: unknown,
  field: string,
): Exclude<AdminPaymentStatus, "none"> {
  const status = requireString(value, field);
  if (!(PAYMENT_STATUSES as readonly string[]).includes(status)) {
    throw new AppError("VALIDATION_ERROR", `Invalid ${field}.`, {
      details: { field, allowed: PAYMENT_STATUSES },
    });
  }
  return status as Exclude<AdminPaymentStatus, "none">;
}

function adminStatus(status: OrderStatus): AdminOrderStatus {
  return toAdminWorkflowStatus(status) as AdminOrderStatus;
}

function statusesMatch(
  current: OrderStatus,
  expected: AdminOrderStatus,
): boolean {
  const normalizedCurrent = adminStatus(current);
  const normalizedExpected =
    expected === "pending" ? "new" : expected;
  return normalizedCurrent === normalizedExpected || current === expected;
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
    orderStatus: adminStatus(order.status),
    createdAt: order.createdAt,
  };
}

function productSummary(items: Order["items"]): string {
  return items
    .map((item) => `${item.quantity}× ${item.name}`)
    .join(", ");
}

function toKitchenItem(row: AdminKitchenOrderRow): AdminKitchenOrderDto {
  const { order } = row;
  const workflowStatus = adminStatus(order.status);
  const allowed = getAllowedNextStatuses(order.status).map((status) =>
    adminStatus(status),
  );
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.customerName,
    boutiqueId: order.pickup.boutiqueId,
    boutiqueName: order.pickup.boutiqueName,
    pickupDate: order.pickup.dateKey,
    pickupTime: order.pickup.timeSlotLabel || row.pickupStartTime,
    itemCount: row.itemCount,
    productSummary: productSummary(order.items),
    customerNote: order.customer.specialRequest?.trim()
      ? order.customer.specialRequest.trim()
      : null,
    orderStatus: workflowStatus,
    paymentStatus: row.paymentStatus,
    allowedNextStatuses: [...new Set(allowed)],
    createdAt: order.createdAt,
    updatedAt: row.updatedAt,
  };
}

function bangkokTodayDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  const workflowStatus = adminStatus(order.status);
  const allowed = getAllowedNextStatuses(order.status).map((status) =>
    adminStatus(status),
  );
  // Deduplicate after NEW/PENDING aliasing.
  const allowedNextStatuses = [...new Set(allowed)];

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderStatus: workflowStatus,
    allowedNextStatuses,
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
    history: record.history.map((entry) => {
      const status = adminStatus(entry.toStatus);
      return {
        id: entry.id,
        status,
        fromStatus: entry.fromStatus ? adminStatus(entry.fromStatus) : null,
        toStatus: status,
        changedAt: entry.createdAt,
        changedBy: entry.changedBy,
        notes: entry.note,
        note: entry.note,
        createdAt: entry.createdAt,
      };
    }),
  };
}

export class AdminOrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly boutiques: BoutiqueRepository,
    private readonly pickupVerifications?: PickupVerificationService,
    private readonly notifications?: NotificationOrchestrator,
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
      paymentStatus = parsePaymentStatus(paymentRaw, "paymentStatus");
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
    const expectedRaw = raw.expectedStatus;
    return {
      status: parseOrderStatus(raw.status, "status"),
      note: optionalString(raw.note, "note") ?? null,
      expectedStatus:
        expectedRaw === undefined || expectedRaw === null || expectedRaw === ""
          ? undefined
          : parseOrderStatus(expectedRaw, "expectedStatus"),
    };
  }

  parseUpdatePaymentBody(body: unknown): AdminUpdateOrderPaymentInput {
    const raw = requireObject(body, "body");
    const expectedRaw = raw.expectedStatus;
    return {
      status: parsePaymentStatus(raw.status, "status"),
      note: optionalString(raw.note, "note") ?? null,
      expectedStatus:
        expectedRaw === undefined || expectedRaw === null || expectedRaw === ""
          ? undefined
          : parsePaymentStatus(expectedRaw, "expectedStatus"),
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

  parseKitchenQuery(searchParams: URLSearchParams): AdminKitchenOrderListQuery {
    const date =
      parseOptionalDateKey(searchParams.get("date"), "date") ??
      bangkokTodayDateKey();
    const search = searchParams.get("search")?.trim() || undefined;
    const boutiqueId = searchParams.get("boutiqueId")?.trim() || undefined;
    const statusRaw = searchParams.get("status");

    let status: AdminOrderStatus | undefined;
    if (statusRaw && statusRaw !== "all") {
      status = parseOrderStatus(statusRaw, "status");
    }

    return {
      date,
      boutiqueId,
      status,
      search,
    };
  }

  async listKitchen(
    query: AdminKitchenOrderListQuery,
  ): Promise<AdminKitchenOrderListResult> {
    requirePrismaDataSource();
    const page = await this.orders.adminKitchenList(query);
    return {
      date: query.date,
      items: page.items.map(toKitchenItem),
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
    const to = fromAdminWorkflowStatus(input.status);

    if (
      input.expectedStatus &&
      !statusesMatch(from, input.expectedStatus)
    ) {
      logger.warn("Duplicate or stale order status update rejected", {
        orderId: id,
        orderNumber: existing.order.orderNumber,
        current: from,
        expected: input.expectedStatus,
      });
      throw new AppError(
        "CONFLICT",
        "Order status has changed. Refresh and try again.",
        {
          details: {
            current: adminStatus(from),
            expected: input.expectedStatus,
          },
        },
      );
    }

    if (from !== to && !getAllowedNextStatuses(from).includes(to)) {
      logger.warn("Invalid order status transition rejected", {
        orderId: id,
        orderNumber: existing.order.orderNumber,
        from: adminStatus(from),
        to: adminStatus(to),
      });
      assertValidStatusTransition(from, to);
    }

    const updated = await this.orders.updateStatus(id, to, {
      note: input.note,
      changedBy: "mock-admin",
    });

    if (to === "confirmed" && this.pickupVerifications) {
      try {
        await this.pickupVerifications.ensureForOrder(updated.id);
      } catch (error) {
        logger.error("Failed to ensure pickup verification after confirm", {
          orderId: updated.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    if (adminStatus(from) !== adminStatus(to) && this.notifications) {
      if (to === "preparing") {
        await this.notifications.onOrderPreparing(updated);
      } else if (to === "ready_for_pickup") {
        await this.notifications.onOrderReadyForPickup(updated);
      } else if (to === "cancelled") {
        await this.notifications.onOrderCancelled(updated);
      } else if (to === "confirmed") {
        // Prefer payment SUCCESS path for ORDER_CONFIRMED; admin confirm is a fallback.
        await this.notifications.onOrderConfirmed(updated);
      }
    }

    if (adminStatus(from) !== adminStatus(to)) {
      if (to === "cancelled") {
        logger.info("Order cancelled", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          from: adminStatus(from),
        });
      } else if (to === "completed") {
        logger.info("Order completed", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          from: adminStatus(from),
        });
      } else {
        logger.info("Order status changed", {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          from: adminStatus(from),
          to: adminStatus(to),
        });
      }
    }

    const detail = await this.orders.adminFindById(id);
    if (!detail) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    return toDetail(detail);
  }

  async updatePayment(
    id: string,
    input: AdminUpdateOrderPaymentInput,
  ): Promise<AdminOrderDetailDto> {
    requirePrismaDataSource();

    const existing = await this.orders.adminFindById(id);
    if (!existing) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }

    if (existing.paymentStatus === "none") {
      throw new AppError(
        "CONFLICT",
        "Order has no payment record to update.",
        { details: { orderId: id } },
      );
    }

    const from = existing.paymentStatus;
    const to = input.status;

    if (input.expectedStatus && from !== input.expectedStatus) {
      logger.warn("Duplicate or stale payment status update rejected", {
        orderId: id,
        orderNumber: existing.order.orderNumber,
        current: from,
        expected: input.expectedStatus,
      });
      throw new AppError(
        "CONFLICT",
        "Payment status has changed. Refresh and try again.",
        { details: { current: from, expected: input.expectedStatus } },
      );
    }

    if (from !== to) {
      const allowed = PAYMENT_TRANSITIONS[from] ?? [];
      if (!allowed.includes(to)) {
        logger.warn("Invalid payment status transition rejected", {
          orderId: id,
          from,
          to,
        });
        throw new AppError(
          "CONFLICT",
          `Invalid payment status transition: ${from} → ${to}.`,
          { details: { from, to, allowed: [...allowed] } },
        );
      }
    }

    const record = await this.orders.updatePaymentStatus(id, to, {
      note: input.note,
      changedBy: "mock-admin",
    });

    if (from !== to) {
      logger.info("Order payment status changed", {
        orderId: id,
        orderNumber: existing.order.orderNumber,
        from,
        to,
      });
    }

    return toDetail(record);
  }
}
