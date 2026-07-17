import type { CreateOrderPaymentDto } from "@/src/server/types/dto";

export type OrderStatus = "pending" | "mock_placed";

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
