import type { Boutique } from "@/src/server/models/boutique";
import type { Cart } from "@/src/server/models/cart";
import type { Category } from "@/src/server/models/category";
import type { Order } from "@/src/server/models/order";
import type { PickupAvailability } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";
import type {
  BoutiqueDto,
  CartDto,
  CategoryDto,
  OrderDto,
  PickupAvailabilityDto,
  ProductDetailDto,
  ProductSummaryDto,
} from "@/src/server/types/dto";

export function toProductSummaryDto(product: Product): ProductSummaryDto {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    categoryId: product.categoryId,
    currency: "THB",
    priceThb: product.priceThb,
    imagePlaceholder: product.imagePlaceholder,
    available: product.available,
  };
}

export function toProductDetailDto(product: Product): ProductDetailDto {
  return {
    ...toProductSummaryDto(product),
    description: [...product.description],
    allergenLabel: product.allergenLabel,
    allergenText: product.allergenText,
    storageLabel: product.storageLabel,
    storageText: product.storageText,
    modifierGroups: product.modifierGroups.map((group) => ({
      id: group.id,
      title: group.title,
      requiredText: group.requiredText,
      type: group.type,
      options: [...group.options],
      optionDetails: group.optionDetails?.map((detail) => ({ ...detail })),
      exactSelectionQuantity: group.exactSelectionQuantity ?? null,
      required: group.required,
      minSelection: group.minSelection ?? null,
      maxSelection: group.maxSelection ?? null,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
      isAcknowledgement: group.isAcknowledgement,
    })),
  };
}

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
  };
}

export function toBoutiqueDto(boutique: Boutique): BoutiqueDto {
  return { ...boutique };
}

export function toPickupAvailabilityDto(
  availability: PickupAvailability,
): PickupAvailabilityDto {
  return {
    boutiqueId: availability.boutiqueId,
    dateKey: availability.dateKey,
    timezone: availability.timezone,
    slots: availability.slots.map((slot) => ({ ...slot })),
  };
}

export function toOrderDto(order: Order): OrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
      note: item.note,
    })),
    customer: { ...order.customer },
    pickup: { ...order.pickup },
    ...(order.payment ? { payment: { ...order.payment } } : {}),
  };
}

export function toCartDto(cart: Cart): CartDto {
  const items = cart.items.map((item) => {
    const unitPriceMinor = item.unitPriceMinor ?? null;
    const priceAvailable =
      typeof unitPriceMinor === "number" &&
      Number.isFinite(unitPriceMinor) &&
      unitPriceMinor >= 0;
    const unitPriceThb = priceAvailable ? unitPriceMinor / 100 : null;
    const lineTotalThb =
      priceAvailable && unitPriceThb !== null
        ? unitPriceThb * item.quantity
        : null;

    return {
      id: item.id,
      productId: item.productId,
      name: item.name,
      imageSrc: item.imageSrc,
      quantity: item.quantity,
      modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
      note: item.note,
      exactSelectionQuantity: item.exactSelectionQuantity ?? null,
      unitPriceThb,
      unitPriceMinor,
      lineTotalThb,
      priceAvailable,
      productAvailable: item.productAvailable !== false,
    };
  });

  const pricesAvailable =
    items.length > 0 && items.every((item) => item.priceAvailable);
  const subtotalThb = pricesAvailable
    ? items.reduce((sum, item) => sum + (item.lineTotalThb ?? 0), 0)
    : null;

  return {
    id: cart.id,
    currency: cart.currency,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalThb,
    pricesAvailable,
  };
}
