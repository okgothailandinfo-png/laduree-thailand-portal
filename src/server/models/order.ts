import type { ProductBehavior } from "@/lib/product/product-behavior";
import type { OrderDelivery } from "@/src/server/models/delivery";
import type { ServiceType } from "@/src/server/models/service-type";
import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "mock_placed";

/**
 * Admin fulfillment workflow label for the initial state.
 * Storefront/checkout persist PENDING; admin surfaces it as "new".
 */
export type AdminWorkflowOrderStatus = "new" | Exclude<OrderStatus, "pending">;

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  modifiers: Array<{ label: string; quantity?: number }>;
  note?: string;
  /** Snapshot unit price in satang; used for persistence, omitted from API DTO. */
  unitPriceMinor: number;
  /** Sprint 33B — historical behavior snapshot (null/omit on pre-33B legacy). */
  productBehavior?: ProductBehavior | null;
  /** Sprint 33B — pack/box size snapshot at order time. */
  packSize?: number | null;
  /** Sprint 33B — exact-selection size snapshot for CONFIGURABLE_BOX. */
  exactSelectionQuantity?: number | null;
  /** Sprint 33B — delivery eligibility snapshot at order time. */
  deliveryEligible?: boolean | null;
};

export type OrderCustomer = {
  customerName: string;
  mobileNumber: string;
  email: string;
  recipientName?: string;
  recipientPhone?: string;
  specialRequest?: string;
};

export type OrderPickup = {
  boutiqueId: string;
  boutiqueName: string;
  address: string;
  dateKey: string;
  timeSlotId: string;
  timeSlotLabel: string;
};

export type OrderPayment = {
  method: CreateOrderPaymentDto["method"];
  methodLabel: string;
  status: "pending" | "mock_accepted" | "failed";
  /** Safe display only (e.g. Card ending in 4242). Never PAN/CVV. */
  safeDisplay?: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  /** Defaults to PICKUP for full backward compatibility. */
  serviceType: ServiceType;
  currency: "THB";
  createdAt: string;
  items: OrderItem[];
  customer: OrderCustomer;
  /**
   * Required for PICKUP. Omitted for DELIVERY — customers never select a boutique
   * or pickup slot; delivery details live on `delivery`.
   */
  pickup?: OrderPickup;
  /** Present when serviceType is DELIVERY. */
  delivery?: OrderDelivery;
  /** Omitted for draft checkout orders (PENDING, no payment yet). */
  payment?: OrderPayment;
  /**
   * Order total in satang (items + delivery fee when quoted).
   * Calculated in the service layer — never trust client totals.
   */
  totalMinor: number;
  termsAccepted: boolean;
  /**
   * Cart that produced this draft — cleared server-side after payment SUCCESS.
   * Optional; absent on older orders / prisma rows without the column.
   */
  sourceCartId?: string;
};

export type OrderHistoryEntry = {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
};
