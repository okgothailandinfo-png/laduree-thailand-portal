import { randomUUID } from "crypto";
import { validateExactSelectionModifiers } from "@/lib/product/exact-selection";
import { computeConfiguredUnitPriceMinor } from "@/lib/product/modifier-pricing";
import { validateRequiredModifierGroups } from "@/lib/product/modifier-requirements";
import {
  createDeliveryFeeEngine,
  type DeliveryFeeEngine,
} from "@/src/server/delivery/fee-engine";
import type { DeliveryAddress } from "@/src/server/models/delivery";
import type { Order } from "@/src/server/models/order";
import type { ServiceType } from "@/src/server/models/service-type";
import { isServiceType } from "@/src/server/models/service-type";
import type {
  BoutiqueRepository,
  CartRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import type {
  CheckoutRequestDto,
  CheckoutResponseDto,
  DeliveryAddressDto,
} from "@/src/server/types/dto";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  isDateKey,
  isValidEmail,
  isValidPhone,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

function createDraftOrderNumber() {
  return `DRAFT-${Date.now().toString(36).toUpperCase()}`;
}

function minorToMajor(minor: number): number {
  return minor / 100;
}

function parseDeliveryAddress(
  raw: unknown,
  fieldPrefix: string,
): DeliveryAddressDto {
  const addressRaw = requireObject(raw, fieldPrefix);
  const phone = requireString(addressRaw.phone, `${fieldPrefix}.phone`);
  if (!isValidPhone(phone)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldPrefix}.phone is invalid.`,
      { details: { field: `${fieldPrefix}.phone` } },
    );
  }
  return {
    recipient: requireString(addressRaw.recipient, `${fieldPrefix}.recipient`),
    phone,
    address: requireString(addressRaw.address, `${fieldPrefix}.address`),
    subdistrict: requireString(
      addressRaw.subdistrict,
      `${fieldPrefix}.subdistrict`,
    ),
    district: requireString(addressRaw.district, `${fieldPrefix}.district`),
    province: requireString(addressRaw.province, `${fieldPrefix}.province`),
    postalCode: requireString(
      addressRaw.postalCode,
      `${fieldPrefix}.postalCode`,
    ),
  };
}

export class DefaultCheckoutService {
  constructor(
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
    private readonly boutiques: BoutiqueRepository,
    private readonly pickup: PickupRepository,
    private readonly orders: OrderRepository,
    private readonly deliveryFees: DeliveryFeeEngine = createDeliveryFeeEngine(),
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

    const dateKey = requireString(pickupRaw.dateKey, "pickup.dateKey");
    if (!isDateKey(dateKey)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.dateKey must be YYYY-MM-DD.",
        { details: { field: "pickup.dateKey" } },
      );
    }

    if (body.termsAccepted !== true) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Terms and conditions must be accepted.",
        { details: { field: "termsAccepted" } },
      );
    }

    let serviceType: ServiceType = "PICKUP";
    if (body.serviceType !== undefined && body.serviceType !== null) {
      if (!isServiceType(body.serviceType)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "serviceType must be PICKUP or DELIVERY.",
          { details: { field: "serviceType" } },
        );
      }
      serviceType = body.serviceType;
    }

    const result: CheckoutRequestDto = {
      customer: {
        firstName: requireString(customerRaw.firstName, "customer.firstName"),
        lastName: requireString(customerRaw.lastName, "customer.lastName"),
        email,
        phone,
      },
      serviceType,
      pickup: {
        boutiqueId: requireString(pickupRaw.boutiqueId, "pickup.boutiqueId"),
        dateKey,
        pickupSlotId: requireString(
          pickupRaw.pickupSlotId,
          "pickup.pickupSlotId",
        ),
      },
      termsAccepted: true,
    };

    if (serviceType === "DELIVERY") {
      const deliveryRaw = requireObject(body.delivery, "delivery");
      result.delivery = {
        address: parseDeliveryAddress(deliveryRaw.address, "delivery.address"),
      };
    }

    return result;
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

    const serviceType: ServiceType = input.serviceType ?? "PICKUP";

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
    // Prisma rows bind slots to a calendar date; mock templates leave dateKey empty.
    if (slot.dateKey && slot.dateKey !== input.pickup.dateKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.dateKey does not match the selected pickup slot.",
        { details: { field: "pickup.dateKey" } },
      );
    }

    // Re-check live availability using the client-confirmed dateKey (authoritative).
    const availability = await this.pickup.getAvailability({
      boutiqueId: boutique.id,
      dateKey: input.pickup.dateKey,
    });
    const availableSlot = availability?.slots.find(
      (item) => item.id === slot.id,
    );
    if (!availableSlot) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.pickupSlotId is not available for the selected boutique/date.",
        { details: { field: "pickup.pickupSlotId" } },
      );
    }

    let deliveryAddress: DeliveryAddress | undefined;
    let deliveryFeeMinor: number | null = null;
    let deliveryZoneId: string | null = null;
    let deliveryFeeStrategy: "FLAT_RATE" | "DISTANCE" | null = null;

    if (serviceType === "DELIVERY") {
      if (!input.delivery?.address) {
        throw new AppError(
          "VALIDATION_ERROR",
          "delivery.address is required for DELIVERY.",
          { details: { field: "delivery.address" } },
        );
      }
      deliveryAddress = { ...input.delivery.address };
      const quote = this.deliveryFees.quote({ address: deliveryAddress });
      if (!quote.matched || quote.reason === "ZONE_INACTIVE") {
        throw new AppError(
          "VALIDATION_ERROR",
          "The postal / address is not available for delivery yet.",
          {
            details: {
              field: "delivery.address",
              code: quote.reason,
            },
          },
        );
      }
      deliveryFeeMinor = quote.feeMinor;
      deliveryZoneId = quote.zoneId;
      deliveryFeeStrategy = quote.strategy;
      // feeMinor may remain null when ZONE_FEE_PENDING / DISTANCE_UNSUPPORTED —
      // never invent a price; items-only total until owner approves a rate.
    }

    const items: Order["items"] = [];
    let itemsMinor = 0;
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

      const requiredModifiers = validateRequiredModifierGroups(
        product.modifierGroups,
        line.modifiers,
      );
      if (!requiredModifiers.ok) {
        throw new AppError("VALIDATION_ERROR", requiredModifiers.message, {
          details: {
            field: "cart.items",
            code: requiredModifiers.code,
            groupId: requiredModifiers.groupId,
            productId: product.id,
          },
        });
      }

      const unitPriceMinor = computeConfiguredUnitPriceMinor(
        product.priceMinor,
        product.modifierGroups,
        line.modifiers,
      );
      if (unitPriceMinor === null) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Price unavailable for one or more products.",
          {
            details: {
              field: "cart.items",
              code: "PRICE_UNAVAILABLE",
              productId: product.id,
            },
          },
        );
      }

      itemsMinor += unitPriceMinor * line.quantity;
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

    const totalMinor = itemsMinor + (deliveryFeeMinor ?? 0);
    const customerName =
      `${input.customer.firstName} ${input.customer.lastName}`.trim();

    const order: Order = {
      id: randomUUID(),
      orderNumber: createDraftOrderNumber(),
      status: "pending",
      serviceType,
      currency: "THB",
      createdAt: new Date().toISOString(),
      items,
      totalMinor,
      termsAccepted: input.termsAccepted,
      customer: {
        customerName,
        mobileNumber: input.customer.phone,
        email: input.customer.email,
        ...(deliveryAddress
          ? {
              recipientName: deliveryAddress.recipient,
              recipientPhone: deliveryAddress.phone,
            }
          : {}),
      },
      pickup: {
        boutiqueId: boutique.id,
        boutiqueName: boutique.name,
        address: boutique.address,
        dateKey: input.pickup.dateKey,
        timeSlotId: slot.id,
        timeSlotLabel: availableSlot.label || slot.label,
      },
      ...(serviceType === "DELIVERY" && deliveryAddress
        ? {
            delivery: {
              address: deliveryAddress,
              feeMinor: deliveryFeeMinor,
              zoneId: deliveryZoneId,
              feeStrategy: deliveryFeeStrategy,
            },
          }
        : {}),
    };

    const saved = await this.orders.create(order);
    logger.info("Draft checkout created", {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
      serviceType: saved.serviceType,
      totalMinor: saved.totalMinor,
      deliveryFeeMinor,
    });

    const subtotal = minorToMajor(itemsMinor);
    const total = minorToMajor(saved.totalMinor);
    return {
      orderId: saved.id,
      subtotal,
      total,
      itemCount,
      status: "PENDING",
      serviceType: saved.serviceType,
      deliveryFee:
        deliveryFeeMinor === null ? null : minorToMajor(deliveryFeeMinor),
    };
  }
}
