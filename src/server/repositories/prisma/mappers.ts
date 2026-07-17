import type {
  Boutique as PrismaBoutique,
  Category as PrismaCategory,
  Customer as PrismaCustomer,
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  PaymentMethod as PrismaPaymentMethod,
  PaymentRecord as PrismaPaymentRecord,
  PickupSlot as PrismaPickupSlot,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
} from "@prisma/client";
import { env } from "@/src/server/config/env";
import type { Boutique } from "@/src/server/models/boutique";
import type { Category } from "@/src/server/models/category";
import type {
  Order,
  OrderItem,
  OrderPayment,
} from "@/src/server/models/order";
import type { PickupAvailability, PickupTimeSlot } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";
import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

const DEFAULT_IMAGE = "/product-placeholder.svg";

export function toDomainCategory(row: PrismaCategory): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sortOrder,
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
  const images = [...(row.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const priceMinor = row.priceMinor;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categoryId: row.categoryId,
    description: [...row.description],
    storageLabel: row.storageLabel ?? "",
    storageText: row.storageText ?? "",
    priceMinor,
    priceThb: priceMinor === null ? null : priceMinor / 100,
    imagePlaceholder: images[0]?.url ?? DEFAULT_IMAGE,
    available: row.available,
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
    status: row.status === "PENDING" ? "pending" : "mock_placed",
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
