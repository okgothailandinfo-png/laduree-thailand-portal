import { randomUUID } from "crypto";
import type { Order } from "@/src/server/models/order";
import type {
  BoutiqueRepository,
  CustomerOrderCompletionRecord,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import type { OrderService } from "@/src/server/services/interfaces";
import { toOrderDto } from "@/src/server/services/mappers";
import type {
  CreateOrderPaymentDto,
  CreateOrderRequestDto,
  OrderCompletionDto,
  OrderDto,
  OrderHistoryItemDto,
} from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import { minorToMajor } from "@/src/server/utils/money";
import {
  isDateKey,
  isValidEmail,
  isValidPhone,
  optionalString,
  requireArray,
  requireBoolean,
  requireObject,
  requirePositiveInt,
  requireString,
} from "@/src/server/utils/validation";

const RECEIPT_LOGO_URL = "/logo.jpg";
const MAX_HISTORY_IDS = 50;

const PAYMENT_LABELS: Record<CreateOrderPaymentDto["method"], string> = {
  "credit-card": "Credit Card",
  "promptpay-qr": "PromptPay QR",
  "apple-pay": "Apple Pay",
  "google-pay": "Google Pay",
};

const PAYMENT_METHODS = new Set<CreateOrderPaymentDto["method"]>([
  "credit-card",
  "promptpay-qr",
  "apple-pay",
  "google-pay",
]);

function createOrderNumber() {
  return `MOCK-${Date.now().toString(36).toUpperCase()}`;
}

function unitPriceMinorFromProduct(priceMinor: number | null): number {
  return priceMinor ?? 0;
}

export class DefaultOrderService implements OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly boutiques: BoutiqueRepository,
    private readonly pickup: PickupRepository,
  ) {}

  parseCreateOrderBody(raw: unknown): CreateOrderRequestDto {
    const body = requireObject(raw, "body");
    const itemsRaw = requireArray(body.items, "items");
    const customerRaw = requireObject(body.customer, "customer");
    const pickupRaw = requireObject(body.pickup, "pickup");
    const paymentRaw = requireObject(body.payment, "payment");
    const termsAccepted = requireBoolean(body.termsAccepted, "termsAccepted");

    const items = itemsRaw.map((item, index) => {
      const row = requireObject(item, `items[${index}]`);
      const modifiersRaw = row.modifiers;
      let modifiers: Array<{ label: string; quantity?: number }> = [];
      if (modifiersRaw !== undefined) {
        if (!Array.isArray(modifiersRaw)) {
          throw new AppError(
            "VALIDATION_ERROR",
            `items[${index}].modifiers must be an array.`,
            { details: { field: `items[${index}].modifiers` } },
          );
        }
        modifiers = modifiersRaw.map((modifier, modifierIndex) => {
          const mod = requireObject(
            modifier,
            `items[${index}].modifiers[${modifierIndex}]`,
          );
          const label = requireString(
            mod.label,
            `items[${index}].modifiers[${modifierIndex}].label`,
          );
          const quantity =
            mod.quantity === undefined
              ? undefined
              : requirePositiveInt(
                  mod.quantity,
                  `items[${index}].modifiers[${modifierIndex}].quantity`,
                );
          return { label, quantity };
        });
      }

      return {
        productId: requireString(row.productId, `items[${index}].productId`),
        quantity: requirePositiveInt(row.quantity, `items[${index}].quantity`),
        modifiers,
        note: optionalString(row.note, `items[${index}].note`),
      };
    });

    const email = requireString(customerRaw.email, "customer.email");
    const mobileNumber = requireString(
      customerRaw.mobileNumber,
      "customer.mobileNumber",
    );
    if (!isValidEmail(email)) {
      throw new AppError("VALIDATION_ERROR", "customer.email is invalid.", {
        details: { field: "customer.email" },
      });
    }
    if (!isValidPhone(mobileNumber)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "customer.mobileNumber is invalid.",
        { details: { field: "customer.mobileNumber" } },
      );
    }

    const recipientPhone = optionalString(
      customerRaw.recipientPhone,
      "customer.recipientPhone",
    );
    if (recipientPhone && !isValidPhone(recipientPhone)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "customer.recipientPhone is invalid.",
        { details: { field: "customer.recipientPhone" } },
      );
    }

    const dateKey = requireString(pickupRaw.dateKey, "pickup.dateKey");
    if (!isDateKey(dateKey)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.dateKey must use YYYY-MM-DD format.",
        { details: { field: "pickup.dateKey" } },
      );
    }

    const method = requireString(paymentRaw.method, "payment.method");
    if (!PAYMENT_METHODS.has(method as CreateOrderPaymentDto["method"])) {
      throw new AppError("VALIDATION_ERROR", "payment.method is invalid.", {
        details: { field: "payment.method" },
      });
    }

    if (!termsAccepted) {
      throw new AppError("VALIDATION_ERROR", "termsAccepted must be true.", {
        details: { field: "termsAccepted" },
      });
    }

    return {
      items,
      customer: {
        customerName: requireString(
          customerRaw.customerName,
          "customer.customerName",
        ),
        mobileNumber,
        email,
        recipientName: optionalString(
          customerRaw.recipientName,
          "customer.recipientName",
        ),
        recipientPhone,
        specialRequest: optionalString(
          customerRaw.specialRequest,
          "customer.specialRequest",
        ),
      },
      pickup: {
        boutiqueId: requireString(pickupRaw.boutiqueId, "pickup.boutiqueId"),
        dateKey,
        timeSlotId: requireString(pickupRaw.timeSlotId, "pickup.timeSlotId"),
      },
      payment: {
        method: method as CreateOrderPaymentDto["method"],
      },
      termsAccepted,
    };
  }

  async createOrder(input: CreateOrderRequestDto): Promise<OrderDto> {
    const boutique = await this.boutiques.findById(input.pickup.boutiqueId);
    if (!boutique) {
      throw new AppError(
        "NOT_FOUND",
        `Boutique not found: ${input.pickup.boutiqueId}`,
      );
    }

    const availability = await this.pickup.getAvailability({
      boutiqueId: input.pickup.boutiqueId,
      dateKey: input.pickup.dateKey,
    });
    const slot = availability?.slots.find(
      (item) => item.id === input.pickup.timeSlotId,
    );
    if (!slot) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.timeSlotId is not available for the selected boutique/date.",
        { details: { field: "pickup.timeSlotId" } },
      );
    }

    const items: Order["items"] = [];
    let totalMinor = 0;

    for (const line of input.items) {
      const product = await this.products.findById(line.productId);
      if (!product || !product.available) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Product unavailable: ${line.productId}`,
          { details: { field: "items.productId", productId: line.productId } },
        );
      }

      const unitPriceMinor = unitPriceMinorFromProduct(product.priceMinor);
      totalMinor += unitPriceMinor * line.quantity;

      items.push({
        productId: product.id,
        name: product.title,
        quantity: line.quantity,
        modifiers: line.modifiers ?? [],
        note: line.note,
        unitPriceMinor,
      });
    }

    const order: Order = {
      id: randomUUID(),
      orderNumber: createOrderNumber(),
      status: "mock_placed",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items,
      totalMinor,
      termsAccepted: input.termsAccepted,
      customer: { ...input.customer },
      pickup: {
        boutiqueId: boutique.id,
        boutiqueName: boutique.name,
        address: boutique.address,
        dateKey: input.pickup.dateKey,
        timeSlotId: slot.id,
        timeSlotLabel: slot.label,
      },
      payment: {
        method: input.payment.method,
        methodLabel: PAYMENT_LABELS[input.payment.method],
        status: "mock_accepted",
      },
    };

    const saved = await this.orders.create(order);
    logger.info("Order placed", {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
      totalMinor: saved.totalMinor,
    });
    return toOrderDto(saved);
  }

  async getOrderById(id: string): Promise<OrderDto> {
    const orderId = requireString(id, "id");
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order not found: ${orderId}`);
    }
    return toOrderDto(order);
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<OrderDto> {
    const value = requireString(orderNumber, "orderNumber");
    const order = await this.orders.findByOrderNumber(value);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order not found: ${value}`);
    }
    return toOrderDto(order);
  }

  async getOrderCompletion(id: string): Promise<OrderCompletionDto> {
    const orderId = requireString(id, "id");
    const record = await this.orders.findCustomerCompletion(orderId);
    if (!record) {
      throw new AppError("NOT_FOUND", `Order not found: ${orderId}`);
    }
    return toCompletionDto(record);
  }

  async listOrderHistory(ids: string[]): Promise<OrderHistoryItemDto[]> {
    const uniqueIds = [
      ...new Set(
        ids
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter(Boolean),
      ),
    ].slice(0, MAX_HISTORY_IDS);

    if (uniqueIds.length === 0) {
      return [];
    }

    const records = await this.orders.findCustomerHistoryByIds(uniqueIds);
    return records.map(toHistoryItemDto);
  }
}

function minorToThb(minor: number): number {
  return minorToMajor(minor);
}

function resolveCompletedAt(record: CustomerOrderCompletionRecord): string | null {
  const fromHistory = [...record.history]
    .reverse()
    .find((entry) => entry.toStatus === "completed");
  if (fromHistory) return fromHistory.createdAt;
  if (record.order.status === "completed") {
    return record.verifiedAt;
  }
  return null;
}

function toCompletionDto(
  record: CustomerOrderCompletionRecord,
): OrderCompletionDto {
  const { order } = record;
  const completedAt = resolveCompletedAt(record);
  const receiptItems = order.items.map((item) => {
    const lineTotalMinor = item.unitPriceMinor * item.quantity;
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPriceThb: minorToThb(item.unitPriceMinor),
      lineTotalThb: minorToThb(lineTotalMinor),
      modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
    };
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    completedAt,
    pickupBoutique: {
      id: order.pickup.boutiqueId,
      name: order.pickup.boutiqueName,
      address: order.pickup.address,
    },
    pickup: {
      dateKey: order.pickup.dateKey,
      timeSlotLabel: order.pickup.timeSlotLabel,
    },
    paymentStatus: record.paymentStatus,
    paymentMethodLabel: order.payment?.methodLabel ?? null,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
      note: item.note,
    })),
    totalThb: minorToThb(order.totalMinor),
    currency: "THB",
    receipt: {
      logoUrl: RECEIPT_LOGO_URL,
      orderNumber: order.orderNumber,
      boutique: {
        name: order.pickup.boutiqueName,
        address: order.pickup.address,
      },
      items: receiptItems,
      totalThb: minorToThb(order.totalMinor),
      currency: "THB",
      pickupDateKey: order.pickup.dateKey,
      pickupTimeSlotLabel: order.pickup.timeSlotLabel,
      completedAt,
    },
    timeline: record.history.map((entry) => ({
      status: entry.toStatus,
      changedAt: entry.createdAt,
      note: entry.note,
    })),
  };
}

function toHistoryItemDto(
  record: CustomerOrderCompletionRecord,
): OrderHistoryItemDto {
  const { order } = record;
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    pickupStatus: order.status,
    boutiqueName: order.pickup.boutiqueName,
    pickupDateKey: order.pickup.dateKey,
    pickupTimeSlotLabel: order.pickup.timeSlotLabel,
    totalThb: minorToThb(order.totalMinor),
    currency: "THB",
    completedAt: resolveCompletedAt(record),
    createdAt: order.createdAt,
  };
}
