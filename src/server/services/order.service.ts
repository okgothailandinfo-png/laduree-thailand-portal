import type { Order } from "@/src/server/models/order";
import type {
  BoutiqueRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import type { OrderService } from "@/src/server/services/interfaces";
import { toOrderDto } from "@/src/server/services/mappers";
import type {
  CreateOrderPaymentDto,
  CreateOrderRequestDto,
  OrderDto,
} from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
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

function createOrderId() {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createOrderNumber() {
  return `MOCK-${Date.now().toString(36).toUpperCase()}`;
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
      throw new AppError(
        "VALIDATION_ERROR",
        "termsAccepted must be true.",
        { details: { field: "termsAccepted" } },
      );
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
    for (const line of input.items) {
      const product = await this.products.findById(line.productId);
      if (!product || !product.available) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Product unavailable: ${line.productId}`,
          { details: { field: "items.productId", productId: line.productId } },
        );
      }
      items.push({
        productId: product.id,
        name: product.title,
        quantity: line.quantity,
        modifiers: line.modifiers ?? [],
        note: line.note,
      });
    }

    const order: Order = {
      id: createOrderId(),
      orderNumber: createOrderNumber(),
      status: "mock_placed",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items,
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
    logger.info("Mock order placed", {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
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
}
