import type {
  Boutique as PrismaBoutique,
  Category as PrismaCategory,
  Customer as PrismaCustomer,
  HomepageBanner as PrismaHomepageBanner,
  HomepageContent as PrismaHomepageContent,
  HomepageSection as PrismaHomepageSection,
  Media as PrismaMedia,
  Order as PrismaOrder,
  OrderHistory as PrismaOrderHistory,
  OrderItem as PrismaOrderItem,
  OrderStatus as PrismaOrderStatus,
  PaymentMethod as PrismaPaymentMethod,
  PaymentRecord as PrismaPaymentRecord,
  PaymentStatus as PrismaPaymentStatus,
  PickupSlot as PrismaPickupSlot,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
} from "@prisma/client";
import { env } from "@/src/server/config/env";
import type { Boutique } from "@/src/server/models/boutique";
import type { Category } from "@/src/server/models/category";
import type {
  HomepageBanner,
  HomepageBannerWithMedia,
  HomepageContent,
  HomepageSection,
} from "@/src/server/models/homepage";
import type { Media } from "@/src/server/models/media";
import type {
  Order,
  OrderHistoryEntry,
  OrderItem,
  OrderPayment,
  OrderStatus,
} from "@/src/server/models/order";
import type { PickupAvailability, PickupTimeSlot } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";
import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

const DEFAULT_IMAGE = "/product-placeholder.svg";

export function toDomainMedia(row: PrismaMedia): Media {
  return {
    id: row.id,
    url: row.url,
    altText: row.altText,
    title: row.title,
    isActive: row.isActive,
    originalFileName: row.originalFileName,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    storageProvider: row.storageProvider,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDomainHomepageBanner(row: PrismaHomepageBanner): HomepageBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageMediaId: row.imageMediaId,
    mobileImageMediaId: row.mobileImageMediaId,
    linkUrl: row.linkUrl,
    linkLabel: row.linkLabel,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDomainHomepageBannerWithMedia(
  row: PrismaHomepageBanner & {
    imageMedia: PrismaMedia;
    mobileImageMedia: PrismaMedia | null;
  },
): HomepageBannerWithMedia {
  return {
    ...toDomainHomepageBanner(row),
    imageUrl: row.imageMedia.url,
    imageAltText: row.imageMedia.altText,
    mobileImageUrl: row.mobileImageMedia?.url ?? null,
    mobileImageAltText: row.mobileImageMedia?.altText ?? null,
  };
}

export function toDomainHomepageSection(
  row: PrismaHomepageSection,
): HomepageSection {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDomainHomepageContent(
  row: PrismaHomepageContent,
): HomepageContent {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    contentType: row.contentType,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDomainCategory(row: PrismaCategory): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function toDomainBoutique(row: PrismaBoutique): Boutique {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    openingHours: row.openingHours,
    lastOrderTime: row.lastOrderTime,
  };
}

export function toDomainProduct(
  row: PrismaProduct & { images?: PrismaProductImage[] },
): Product {
  const images = [...(row.images ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({
      id: image.id,
      mediaId: image.mediaId,
      url: image.url,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    }));
  const primary =
    images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const priceMinor = row.priceMinor;
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    title: row.title,
    categoryId: row.categoryId,
    description: [...row.description],
    storageLabel: row.storageLabel ?? "",
    storageText: row.storageText ?? "",
    priceMinor,
    priceThb: priceMinor === null ? null : priceMinor / 100,
    currency: "THB",
    imagePlaceholder: primary?.url ?? DEFAULT_IMAGE,
    images,
    isActive: row.isActive,
    available: row.available,
    sortOrder: row.sortOrder,
    // Modifier groups are not persisted in the current Prisma schema.
    modifierGroups: [],
  };
}

export function toDomainPickupSlot(row: PrismaPickupSlot): PickupTimeSlot {
  return {
    id: row.id,
    label: row.label,
    start: row.startTime,
    end: row.endTime,
  };
}

export function toDomainPickupAvailability(
  boutiqueId: string,
  dateKey: string,
  slots: PrismaPickupSlot[],
): PickupAvailability {
  return {
    boutiqueId,
    dateKey,
    timezone: env.timezone,
    slots: slots.map(toDomainPickupSlot),
  };
}

const METHOD_TO_DOMAIN: Record<
  PrismaPaymentMethod,
  CreateOrderPaymentDto["method"]
> = {
  CREDIT_CARD: "credit-card",
  PROMPTPAY_QR: "promptpay-qr",
  APPLE_PAY: "apple-pay",
  GOOGLE_PAY: "google-pay",
};

const METHOD_TO_PRISMA: Record<
  CreateOrderPaymentDto["method"],
  PrismaPaymentMethod
> = {
  "credit-card": "CREDIT_CARD",
  "promptpay-qr": "PROMPTPAY_QR",
  "apple-pay": "APPLE_PAY",
  "google-pay": "GOOGLE_PAY",
};

const METHOD_LABELS: Record<CreateOrderPaymentDto["method"], string> = {
  "credit-card": "Credit Card",
  "promptpay-qr": "PromptPay QR",
  "apple-pay": "Apple Pay",
  "google-pay": "Google Pay",
};

export function toPrismaPaymentMethod(
  method: CreateOrderPaymentDto["method"],
): PrismaPaymentMethod {
  return METHOD_TO_PRISMA[method];
}

export function toDomainPaymentMethod(
  method: PrismaPaymentMethod,
): CreateOrderPaymentDto["method"] {
  return METHOD_TO_DOMAIN[method];
}

export function paymentMethodLabel(
  method: CreateOrderPaymentDto["method"],
): string {
  return METHOD_LABELS[method];
}

function parseModifiers(value: unknown): OrderItem["modifiers"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as { label?: unknown; quantity?: unknown };
    if (typeof row.label !== "string" || !row.label.trim()) return [];
    const modifier: OrderItem["modifiers"][number] = {
      label: row.label.trim(),
    };
    if (typeof row.quantity === "number" && Number.isInteger(row.quantity)) {
      modifier.quantity = row.quantity;
    }
    return [modifier];
  });
}

function toDomainPayment(
  payment: PrismaPaymentRecord | null | undefined,
): OrderPayment | undefined {
  if (!payment) return undefined;

  const method = toDomainPaymentMethod(payment.method);
  return {
    method,
    methodLabel: METHOD_LABELS[method],
    status: "mock_accepted",
  };
}

export function toDomainOrderStatus(status: PrismaOrderStatus): OrderStatus {
  switch (status) {
    case "PENDING":
      return "pending";
    case "CONFIRMED":
      return "confirmed";
    case "PREPARING":
      return "preparing";
    case "READY_FOR_PICKUP":
      return "ready_for_pickup";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "PLACED":
      return "mock_placed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function toPrismaOrderStatus(status: OrderStatus): PrismaOrderStatus {
  switch (status) {
    case "pending":
      return "PENDING";
    case "confirmed":
      return "CONFIRMED";
    case "preparing":
      return "PREPARING";
    case "ready_for_pickup":
      return "READY_FOR_PICKUP";
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    case "mock_placed":
      return "PLACED";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function toAdminPaymentStatus(
  payment: PrismaPaymentRecord | null | undefined,
): "pending" | "mock_accepted" | "failed" | "none" {
  if (!payment) return "none";
  return toDomainPaymentRecordStatus(payment.status);
}

export function toDomainPaymentRecordStatus(
  status: PrismaPaymentStatus,
): "pending" | "mock_accepted" | "failed" {
  switch (status) {
    case "PENDING":
      return "pending";
    case "MOCK_ACCEPTED":
      return "mock_accepted";
    case "FAILED":
      return "failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function toDomainOrderHistory(
  row: PrismaOrderHistory,
): OrderHistoryEntry {
  return {
    id: row.id,
    orderId: row.orderId,
    fromStatus: row.fromStatus ? toDomainOrderStatus(row.fromStatus) : null,
    toStatus: toDomainOrderStatus(row.toStatus),
    note: row.note,
    changedBy: row.changedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export type PrismaOrderWithRelations = PrismaOrder & {
  customer: PrismaCustomer;
  boutique: PrismaBoutique;
  pickupSlot: PrismaPickupSlot;
  items: PrismaOrderItem[];
  payment: PrismaPaymentRecord | null;
};

export function toDomainOrder(row: PrismaOrderWithRelations): Order {
  const payment = toDomainPayment(row.payment);
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: toDomainOrderStatus(row.status),
    currency: "THB",
    createdAt: row.createdAt.toISOString(),
    totalMinor: row.totalMinor,
    termsAccepted: row.termsAccepted,
    items: row.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      modifiers: parseModifiers(item.modifiers),
      note: item.note ?? undefined,
      unitPriceMinor: item.unitPriceMinor,
    })),
    customer: {
      customerName: row.customer.customerName,
      mobileNumber: row.customer.mobileNumber,
      email: row.customer.email,
      recipientName: row.customer.recipientName ?? undefined,
      recipientPhone: row.customer.recipientPhone ?? undefined,
      specialRequest: row.specialRequest ?? undefined,
    },
    pickup: {
      boutiqueId: row.boutiqueId,
      boutiqueName: row.boutique.name,
      address: row.boutique.address,
      dateKey: row.pickupSlot.dateKey,
      timeSlotId: row.pickupSlotId,
      timeSlotLabel: row.pickupSlot.label,
    },
    ...(payment ? { payment } : {}),
  };
}
