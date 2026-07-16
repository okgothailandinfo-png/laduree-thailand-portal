import type { Boutique } from "@/src/server/models/boutique";
import type { Category } from "@/src/server/models/category";
import type { Order } from "@/src/server/models/order";
import type { PickupAvailability } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";
import type {
  BoutiqueDto,
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
    storageLabel: product.storageLabel,
    storageText: product.storageText,
    modifierGroups: product.modifierGroups.map((group) => ({
      id: group.id,
      title: group.title,
      requiredText: group.requiredText,
      type: group.type,
      options: [...group.options],
    })),
  };
}

export function toCategoryDto(category: Category): CategoryDto {
  return { ...category };
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
    payment: { ...order.payment },
  };
}
