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
  status: "mock_accepted";
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: "THB";
  createdAt: string;
  items: OrderItem[];
  customer: OrderCustomer;
  pickup: OrderPickup;
  /** Omitted for draft checkout orders (PENDING, no payment yet). */
  payment?: OrderPayment;
  /** Order total in satang; calculated in the service layer. */
  totalMinor: number;
  termsAccepted: boolean;
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
