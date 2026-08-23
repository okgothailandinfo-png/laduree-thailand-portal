import { randomUUID } from "crypto";
import { evaluateProductPurchasability } from "@/lib/catalog/product-purchasability";
import {
  isPreviewTestCatalogEnabled,
  isPreviewTestCatalogSku,
} from "@/lib/preview/preview-test-catalog";
import { isPublicPreview } from "@/lib/preview/public-preview";
import {
  assertPublicPreviewCheckoutPaymentAllowed,
  assertPublicPreviewCommerceAllowed,
} from "@/src/server/preview/commerce-guard";
import { validateExactSelectionModifiers } from "@/lib/product/exact-selection";
import { computeConfiguredUnitPriceMinor } from "@/lib/product/modifier-pricing";
import { validateRequiredModifierGroups } from "@/lib/product/modifier-requirements";
import {
  isDeliveryEligibleProduct,
  snapshotProductBehavior,
  usesExactSelection,
} from "@/lib/product/product-behavior";
import {
  createRuntimeDeliveryAvailabilityEngine,
  createRuntimeDeliveryFeeEngine,
  type DeliveryAvailabilityEngine,
  type DeliveryFeeEngine,
} from "@/src/server/delivery";
import {
  isDeliveryDemoFixtureEnabled,
  resolveDemoEarliestPromise,
} from "@/src/server/delivery/demo-fixture";
import type { DeliveryAddress, DeliveryMode } from "@/src/server/models/delivery";
import { isDeliveryMode } from "@/src/server/models/delivery";
import type { Order, OrderItem } from "@/src/server/models/order";
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
  CheckoutDeliveryRequestDto,
  CheckoutPickupRequestDto,
  CheckoutRequestDto,
  CheckoutResponseDto,
  DeliveryAddressDto,
} from "@/src/server/types/dto";
import { issueOrderAccessToken } from "@/src/server/orders/order-access-token";
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

function optionalTrimmedString(
  raw: Record<string, unknown>,
  key: string,
  fieldPrefix: string,
): string | undefined {
  const value = raw[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldPrefix}.${key} must be a string.`,
      { details: { field: `${fieldPrefix}.${key}` } },
    );
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
  const postalCode = requireString(
    addressRaw.postalCode,
    `${fieldPrefix}.postalCode`,
  );
  if (!/^\d{5}$/.test(postalCode.trim())) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldPrefix}.postalCode must be a 5-digit Thai postal code.`,
      { details: { field: `${fieldPrefix}.postalCode` } },
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
    postalCode: postalCode.trim(),
    building: optionalTrimmedString(addressRaw, "building", fieldPrefix),
    unitFloor: optionalTrimmedString(addressRaw, "unitFloor", fieldPrefix),
    notes: optionalTrimmedString(addressRaw, "notes", fieldPrefix),
  };
}

function parseCustomer(body: Record<string, unknown>) {
  const customerRaw = requireObject(body.customer, "customer");
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
    firstName: requireString(customerRaw.firstName, "customer.firstName"),
    lastName: requireString(customerRaw.lastName, "customer.lastName"),
    email,
    phone,
    recipientName: optionalTrimmedString(
      customerRaw,
      "recipientName",
      "customer",
    ),
    specialRequest: optionalTrimmedString(
      customerRaw,
      "specialRequest",
      "customer",
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
    private readonly deliveryFees: DeliveryFeeEngine = createRuntimeDeliveryFeeEngine(),
    private readonly deliveryAvailability: DeliveryAvailabilityEngine = createRuntimeDeliveryAvailabilityEngine(),
  ) {}

  parseCheckoutBody(raw: unknown): CheckoutRequestDto {
    const body = requireObject(raw, "body");

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

    const customer = parseCustomer(body);

    if (serviceType === "DELIVERY") {
      if (body.pickup !== undefined && body.pickup !== null) {
        throw new AppError(
          "VALIDATION_ERROR",
          "pickup must not be provided for DELIVERY.",
          { details: { field: "pickup" } },
        );
      }
      const deliveryRaw = requireObject(body.delivery, "delivery");
      const modeRaw = deliveryRaw.mode ?? "EARLIEST_AVAILABLE";
      if (!isDeliveryMode(modeRaw)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "delivery.mode must be EARLIEST_AVAILABLE or PREORDER.",
          { details: { field: "delivery.mode" } },
        );
      }
      const delivery: CheckoutDeliveryRequestDto = {
        mode: modeRaw,
        address: parseDeliveryAddress(deliveryRaw.address, "delivery.address"),
      };
      if (modeRaw === "PREORDER") {
        const dateKey = requireString(deliveryRaw.dateKey, "delivery.dateKey");
        if (!isDateKey(dateKey)) {
          throw new AppError(
            "VALIDATION_ERROR",
            "delivery.dateKey must be YYYY-MM-DD.",
            { details: { field: "delivery.dateKey" } },
          );
        }
        delivery.dateKey = dateKey;
      }
      return {
        customer,
        serviceType,
        delivery,
        termsAccepted: true,
      };
    }

    // PICKUP path — unchanged requirements.
    const pickupRaw = requireObject(body.pickup, "pickup");
    const dateKey = requireString(pickupRaw.dateKey, "pickup.dateKey");
    if (!isDateKey(dateKey)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.dateKey must be YYYY-MM-DD.",
        { details: { field: "pickup.dateKey" } },
      );
    }
    const pickup: CheckoutPickupRequestDto = {
      boutiqueId: requireString(pickupRaw.boutiqueId, "pickup.boutiqueId"),
      dateKey,
      pickupSlotId: requireString(
        pickupRaw.pickupSlotId,
        "pickup.pickupSlotId",
      ),
    };
    return {
      customer,
      serviceType: "PICKUP",
      pickup,
      termsAccepted: true,
    };
  }

  private async buildCartItems(
    cartId: string,
    serviceType: ServiceType = "PICKUP",
  ): Promise<{
    items: OrderItem[];
    itemsMinor: number;
    itemCount: number;
  }> {
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

    const items: OrderItem[] = [];
    let itemsMinor = 0;
    let itemCount = 0;

    for (const line of cart.items) {
      const product = await this.products.findById(line.productId);
      if (!product) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Product unavailable: ${line.productId}`,
          { details: { field: "cart.items", productId: line.productId } },
        );
      }

      if (
        isPreviewTestCatalogEnabled() &&
        !isPreviewTestCatalogSku(product.sku)
      ) {
        assertPublicPreviewCommerceAllowed();
      }

      const purchasability = evaluateProductPurchasability(product);
      if (!purchasability.purchasable) {
        throw new AppError(
          "VALIDATION_ERROR",
          purchasability.reasons.includes("PRICE_UNAVAILABLE")
            ? "Price unavailable for one or more products."
            : `Product unavailable: ${line.productId}`,
          {
            details: {
              field: "cart.items",
              code: purchasability.reasons.includes("PRICE_UNAVAILABLE")
                ? "PRICE_UNAVAILABLE"
                : "PRODUCT_UNAVAILABLE",
              productId: product.id,
              reasons: purchasability.reasons,
            },
          },
        );
      }

      if (
        serviceType === "DELIVERY" &&
        !isDeliveryEligibleProduct(product)
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "One or more products are not available for delivery.",
          {
            details: {
              field: "cart.items",
              code: "DELIVERY_INELIGIBLE",
              productId: product.id,
            },
          },
        );
      }

      if (usesExactSelection(product.productBehavior)) {
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
              productBehavior: product.productBehavior,
            },
          });
        }
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

      const snapshot = snapshotProductBehavior(product);
      itemsMinor += unitPriceMinor * line.quantity;
      itemCount += line.quantity;
      items.push({
        productId: product.id,
        name: product.title,
        quantity: line.quantity,
        modifiers: line.modifiers.map((modifier) => ({ ...modifier })),
        note: line.note,
        unitPriceMinor,
        productBehavior: snapshot.productBehavior,
        packSize: snapshot.packSize,
        exactSelectionQuantity: snapshot.exactSelectionQuantity,
        deliveryEligible: snapshot.deliveryEligible,
      });
    }

    return { items, itemsMinor, itemCount };
  }

  private async createPickupDraft(
    cartId: string,
    input: CheckoutRequestDto,
  ): Promise<CheckoutResponseDto> {
    if (!input.pickup) {
      throw new AppError("VALIDATION_ERROR", "pickup is required for PICKUP.", {
        details: { field: "pickup" },
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
    if (slot.dateKey && slot.dateKey !== input.pickup.dateKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "pickup.dateKey does not match the selected pickup slot.",
        { details: { field: "pickup.dateKey" } },
      );
    }

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

    await this.pickup.reserveSlotCapacity(slot.id);

    const { items, itemsMinor, itemCount } = await this.buildCartItems(
      cartId,
      "PICKUP",
    );
    const customerName =
      `${input.customer.firstName} ${input.customer.lastName}`.trim();

    const order: Order = {
      id: randomUUID(),
      orderNumber: createDraftOrderNumber(),
      status: "pending",
      serviceType: "PICKUP",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items,
      totalMinor: itemsMinor,
      termsAccepted: input.termsAccepted,
      sourceCartId: cartId,
      customer: {
        customerName,
        mobileNumber: input.customer.phone,
        email: input.customer.email,
        recipientName: input.customer.recipientName,
        specialRequest: input.customer.specialRequest,
      },
      pickup: {
        boutiqueId: boutique.id,
        boutiqueName: boutique.name,
        address: boutique.address,
        dateKey: input.pickup.dateKey,
        timeSlotId: slot.id,
        timeSlotLabel: availableSlot.label || slot.label,
      },
    };

    let saved: Order;
    try {
      saved = await this.orders.create(order);
    } catch (error) {
      await this.pickup.releaseSlotCapacity(slot.id);
      throw error;
    }
    logger.info("Draft checkout created", {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
      serviceType: saved.serviceType,
      totalMinor: saved.totalMinor,
    });

    const total = minorToMajor(saved.totalMinor);
    return {
      orderId: saved.id,
      subtotal: total,
      total,
      itemCount,
      status: "PENDING",
      serviceType: "PICKUP",
      deliveryFee: null,
      accessToken: issueOrderAccessToken(saved.id),
    };
  }

  private async createDeliveryDraft(
    cartId: string,
    input: CheckoutRequestDto,
  ): Promise<CheckoutResponseDto> {
    if (!input.delivery?.address) {
      throw new AppError(
        "VALIDATION_ERROR",
        "delivery.address is required for DELIVERY.",
        { details: { field: "delivery.address" } },
      );
    }

    const mode: DeliveryMode =
      input.delivery.mode ?? "EARLIEST_AVAILABLE";
    const deliveryAddress: DeliveryAddress = { ...input.delivery.address };

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
    if (quote.feeMinor === null) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Delivery fee is unavailable for this address.",
        {
          details: {
            field: "delivery.fee",
            code: quote.reason,
          },
        },
      );
    }

    let dateKey: string | null = null;
    let timeSlotId: string | null = null;
    let timeSlotLabel: string | null = null;
    let promiseRelativeLabel: "Today" | "Tomorrow" | null = null;

    if (mode === "EARLIEST_AVAILABLE") {
      const now = new Date();
      const basePromise = this.deliveryAvailability.resolveEarliestAvailable(now);
      const promise = isDeliveryDemoFixtureEnabled()
        ? resolveDemoEarliestPromise(
            deliveryAddress.postalCode,
            now,
            basePromise,
          )
        : basePromise;
      if (
        !promise.available ||
        !promise.dateKey ||
        !promise.timeWindow
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Delivery is not available at this time.",
          {
            details: {
              field: "delivery.mode",
              code: promise.reason,
            },
          },
        );
      }
      dateKey = promise.dateKey;
      promiseRelativeLabel = promise.relativeLabel;
      timeSlotId = promise.timeWindow.id;
      timeSlotLabel = promise.timeWindow.label;
    } else {
      const preorderDateKey = input.delivery.dateKey;
      if (!preorderDateKey || !isDateKey(preorderDateKey)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "delivery.dateKey is required for PREORDER delivery.",
          { details: { field: "delivery.dateKey" } },
        );
      }
      const resolved =
        this.deliveryAvailability.resolvePreorderWindow(preorderDateKey);
      if (!resolved.available || !resolved.timeWindow || !resolved.dateKey) {
        throw new AppError(
          "VALIDATION_ERROR",
          resolved.reason === "TODAY_OR_PAST"
            ? "Pre-order delivery date must be a future date."
            : "Selected delivery date is not available.",
          {
            details: {
              field: "delivery.dateKey",
              code: resolved.reason,
            },
          },
        );
      }
      dateKey = resolved.dateKey;
      timeSlotId = resolved.timeWindow.id;
      timeSlotLabel = resolved.timeWindow.label;
    }

    const { items, itemsMinor, itemCount } = await this.buildCartItems(
      cartId,
      "DELIVERY",
    );
    const totalMinor = itemsMinor + quote.feeMinor;
    const customerName =
      `${input.customer.firstName} ${input.customer.lastName}`.trim();

    const order: Order = {
      id: randomUUID(),
      orderNumber: createDraftOrderNumber(),
      status: "pending",
      serviceType: "DELIVERY",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items,
      totalMinor,
      termsAccepted: input.termsAccepted,
      sourceCartId: cartId,
      customer: {
        customerName,
        mobileNumber: input.customer.phone,
        email: input.customer.email,
        recipientName: deliveryAddress.recipient,
        recipientPhone: deliveryAddress.phone,
      },
      delivery: {
        mode,
        address: deliveryAddress,
        feeMinor: quote.feeMinor,
        zoneId: quote.zoneId,
        feeStrategy: quote.strategy,
        dateKey,
        timeSlotId,
        timeSlotLabel,
        promiseRelativeLabel,
        fulfilmentBoutiqueId: quote.boutiqueId,
      },
    };

    const saved = await this.orders.create(order);
    logger.info("Draft checkout created", {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
      serviceType: saved.serviceType,
      deliveryMode: mode,
      totalMinor: saved.totalMinor,
      deliveryFeeMinor: quote.feeMinor,
    });

    return {
      orderId: saved.id,
      subtotal: minorToMajor(itemsMinor),
      total: minorToMajor(saved.totalMinor),
      itemCount,
      status: "PENDING",
      serviceType: "DELIVERY",
      deliveryMode: mode,
      deliveryFee: minorToMajor(quote.feeMinor),
      deliveryDateKey: dateKey,
      deliveryTimeWindowLabel: timeSlotLabel,
      deliveryPromiseRelativeLabel: promiseRelativeLabel,
      accessToken: issueOrderAccessToken(saved.id),
    };
  }

  async createDraftCheckout(
    cartId: string | undefined,
    input: CheckoutRequestDto,
  ): Promise<CheckoutResponseDto> {
    const serviceType: ServiceType = input.serviceType ?? "PICKUP";
    if (isPublicPreview() && serviceType === "DELIVERY") {
      assertPublicPreviewCommerceAllowed();
    }
    assertPublicPreviewCheckoutPaymentAllowed();
    if (!cartId) {
      throw new AppError("VALIDATION_ERROR", "Cart not found.", {
        details: { field: "cart" },
      });
    }

    if (serviceType === "DELIVERY") {
      return this.createDeliveryDraft(cartId, input);
    }
    return this.createPickupDraft(cartId, input);
  }
}
