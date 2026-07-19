import { randomUUID } from "crypto";
import { validateExactSelectionModifiers } from "@/lib/product/exact-selection";
import type {
  BoutiqueRepository,
  CartRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import type { Order } from "@/src/server/models/order";
import type {
  CheckoutRequestDto,
  CheckoutResponseDto,
} from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  isValidEmail,
  isValidPhone,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

function createDraftOrderNumber() {
  return `DRAFT-${Date.now().toString(36).toUpperCase()}`;
}

function unitPriceMinorFromProduct(priceMinor: number | null): number {
  return priceMinor ?? 0;
}

function minorToMajor(minor: number): number {
  return minor / 100;
}

export class DefaultCheckoutService {
  constructor(
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
    private readonly boutiques: BoutiqueRepository,
    private readonly pickup: PickupRepository,
    private readonly orders: OrderRepository,
  ) {}

  parseCheckoutBody(raw: unknown): CheckoutRequestDto {
    const body = requireObject(raw, "body");
    const customerRaw = requireObject(body.customer, "customer");
    const pickupRaw = requireObject(body.pickup, "pickup");

    const email = requireString(customerRaw.email, "customer.email");
    const phone = requireString(customerRaw.phone, "customer.phone");
    if (!isValidEmail(email)) {
      throw new AppError("VALIDATION_ERROR", "customer.email is invalid.", {
        details: { field: "customer.email" },
      });
    }
    if (!isValidPhone(phone)) {
      throw new AppError("VALIDATION_ERROR", "customer.phone is invalid.", {
        details: { field: "customer.phone" },
      });
    }

    return {
      customer: {
        firstName: requireString(customerRaw.firstName, "customer.firstName"),
        lastName: requireString(customerRaw.lastName, "customer.lastName"),
        email,
        phone,
      },
      pickup: {
        boutiqueId: requireString(pickupRaw.boutiqueId, "pickup.boutiqueId"),
        pickupSlotId: requireString(
          pickupRaw.pickupSlotId,
          "pickup.pickupSlotId",
        ),
      },
    };
  }

  async createDraftCheckout(
    cartId: string | undefined,
    input: CheckoutRequestDto,
  ): Promise<CheckoutResponseDto> {
    if (!cartId) {
      throw new AppError("VALIDATION_ERROR", "Cart not found.", {
        details: { field: "cart" },
      });
    }

    const cart = await this.carts.findById(cartId);
    if (!cart) {
      throw new AppError("VALIDATION_ERROR", "Cart not found.", {
        details: { field: "cart" },
      });
    }
    if (cart.items.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Cart is empty.", {
        details: { field: "cart" },
      });
    }

    const boutique = await this.boutiques.findById(input.pickup.boutiqueId);
    if (!boutique) {
      throw new AppError(
        "NOT_FOUND",
        `Boutique not found: ${input.pickup.boutiqueId}`,
      );
    }

    const slot = await this.pickup.findSlotById(input.pickup.pickupSlotId);
    if (!slot) {
      throw new AppError(
        "NOT_FOUND",
        `Pickup slot not found: ${input.pickup.pickupSlotId}`,
      );
    }
    if (slot.boutiqueId && slot.boutiqueId !== boutique.id) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.pickupSlotId does not belong to the selected boutique.",
        { details: { field: "pickup.pickupSlotId" } },
      );
    }

    const items: Order["items"] = [];
    let totalMinor = 0;
    let itemCount = 0;

    for (const line of cart.items) {
      const product = await this.products.findById(line.productId);
      if (!product || !product.available) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Product unavailable: ${line.productId}`,
          { details: { field: "cart.items", productId: line.productId } },
        );
      }

      const exactSelection = validateExactSelectionModifiers(
        product.modifierGroups,
        line.modifiers,
        line.quantity,
      );
      if (!exactSelection.ok) {
        throw new AppError("VALIDATION_ERROR", exactSelection.message, {
          details: {
            field: "cart.items",
            code: exactSelection.code,
            productId: product.id,
          },
        });
      }

      const unitPriceMinor = unitPriceMinorFromProduct(product.priceMinor);
      totalMinor += unitPriceMinor * line.quantity;
      itemCount += line.quantity;

      items.push({
        productId: product.id,
        name: product.title,
        quantity: line.quantity,
        modifiers: line.modifiers.map((modifier) => ({ ...modifier })),
        note: line.note,
        unitPriceMinor,
      });
    }

    const customerName =
      `${input.customer.firstName} ${input.customer.lastName}`.trim();

    const order: Order = {
      id: randomUUID(),
      orderNumber: createDraftOrderNumber(),
      status: "pending",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items,
      totalMinor,
      termsAccepted: true,
      customer: {
        customerName,
        mobileNumber: input.customer.phone,
        email: input.customer.email,
      },
      pickup: {
        boutiqueId: boutique.id,
        boutiqueName: boutique.name,
        address: boutique.address,
        dateKey: slot.dateKey,
        timeSlotId: slot.id,
        timeSlotLabel: slot.label,
      },
    };

    const saved = await this.orders.create(order);
    logger.info("Draft checkout created", {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
      totalMinor: saved.totalMinor,
    });

    const total = minorToMajor(saved.totalMinor);
    return {
      orderId: saved.id,
      subtotal: total,
      total,
      itemCount,
      status: "PENDING",
    };
  }
}
