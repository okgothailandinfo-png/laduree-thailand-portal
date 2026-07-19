/** Request / response DTOs for placeholder APIs. */

export type ProductSummaryDto = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  currency: "THB";
  /** Thailand retail price pending owner approval when null. */
  priceThb: number | null;
  imagePlaceholder: string;
  available: boolean;
};

export type ProductDetailDto = ProductSummaryDto & {
  description: string[];
  allergenLabel: string;
  allergenText: string;
  storageLabel: string;
  storageText: string;
  modifierGroups: ProductModifierGroupDto[];
};

export type ProductModifierOptionDetailDto = {
  label: string;
  priceMinor?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type ProductModifierGroupDto = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
  optionDetails?: ProductModifierOptionDetailDto[];
  /** Fixed-size box exact selection (e.g. 8). Null/undefined = no exact rule. */
  exactSelectionQuantity?: number | null;
  required?: boolean;
  minSelection?: number | null;
  maxSelection?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  isAcknowledgement?: boolean;
};

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type BoutiqueDto = {
  id: string;
  name: string;
  code: string;
  address: string;
  openingHours: string;
  lastOrderTime: string;
};

export type PickupTimeSlotDto = {
  id: string;
  label: string;
  start: string;
  end: string;
};

export type PickupAvailabilityDto = {
  boutiqueId: string;
  dateKey: string;
  timezone: string;
  slots: PickupTimeSlotDto[];
};

export type CartModifierDto = {
  label: string;
  quantity?: number;
};

export type CartItemDto = {
  id: string;
  productId: string;
  name: string;
  imageSrc: string;
  quantity: number;
  modifiers: CartModifierDto[];
  note?: string;
  exactSelectionQuantity?: number | null;
  /** Trusted catalog unit price in THB major units. Null until approved. */
  unitPriceThb: number | null;
  unitPriceMinor: number | null;
  lineTotalThb: number | null;
  priceAvailable: boolean;
  productAvailable: boolean;
};

export type CartDto = {
  id: string;
  currency: "THB";
  items: CartItemDto[];
  itemCount: number;
  subtotalThb: number | null;
  pricesAvailable: boolean;
};

export type AddCartItemRequestDto = {
  productId: string;
  quantity: number;
  modifiers?: CartModifierDto[];
  note?: string;
};

export type UpdateCartItemRequestDto = {
  quantity: number;
};

export type CreateOrderItemDto = {
  productId: string;
  quantity: number;
  modifiers?: Array<{ label: string; quantity?: number }>;
  note?: string;
};

export type CreateOrderCustomerDto = {
  customerName: string;
  mobileNumber: string;
  email: string;
  recipientName?: string;
  recipientPhone?: string;
  specialRequest?: string;
};

export type CreateOrderPickupDto = {
  boutiqueId: string;
  dateKey: string;
  timeSlotId: string;
};

export type CreateOrderPaymentDto = {
  method: "credit-card" | "promptpay-qr" | "apple-pay" | "google-pay";
};

export type CreateOrderRequestDto = {
  items: CreateOrderItemDto[];
  customer: CreateOrderCustomerDto;
  pickup: CreateOrderPickupDto;
  payment: CreateOrderPaymentDto;
  termsAccepted: boolean;
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "completed"
    | "cancelled"
    | "mock_placed";
  currency: "THB";
  /** Server-trusted order total in THB major units (never client-submitted). */
  totalThb: number;
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    modifiers: Array<{ label: string; quantity?: number }>;
    note?: string;
  }>;
  customer: CreateOrderCustomerDto;
  pickup: {
    boutiqueId: string;
    boutiqueName: string;
    address: string;
    dateKey: string;
    timeSlotId: string;
    timeSlotLabel: string;
  };
  payment?: {
    method: CreateOrderPaymentDto["method"];
    methodLabel: string;
    status: "mock_accepted";
  };
};

export type CheckoutCustomerRequestDto = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type CheckoutPickupRequestDto = {
  boutiqueId: string;
  /** Asia/Bangkok calendar date YYYY-MM-DD — authoritative for order pickup date. */
  dateKey: string;
  pickupSlotId: string;
};

export type CheckoutRequestDto = {
  customer: CheckoutCustomerRequestDto;
  pickup: CheckoutPickupRequestDto;
  /** Must be true; server rejects missing/false acknowledgements. */
  termsAccepted: boolean;
};

export type CheckoutResponseDto = {
  orderId: string;
  subtotal: number;
  total: number;
  itemCount: number;
  status: "PENDING";
};

export type OrderCompletionPaymentStatus =
  | "pending"
  | "mock_accepted"
  | "failed"
  | "none";

export type OrderCompletionReceiptItemDto = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceThb: number;
  lineTotalThb: number;
  modifiers: Array<{ label: string; quantity?: number }>;
};

export type OrderCompletionReceiptDto = {
  logoUrl: string;
  orderNumber: string;
  boutique: {
    name: string;
    address: string;
  };
  items: OrderCompletionReceiptItemDto[];
  totalThb: number;
  currency: "THB";
  pickupDateKey: string;
  pickupTimeSlotLabel: string;
  completedAt: string | null;
};

export type OrderCompletionTimelineEntryDto = {
  status: OrderDto["status"];
  changedAt: string;
  note: string | null;
};

/** GET /api/orders/:id/completion */
export type OrderCompletionDto = {
  orderId: string;
  orderNumber: string;
  status: OrderDto["status"];
  completedAt: string | null;
  pickupBoutique: {
    id: string;
    name: string;
    address: string;
  };
  pickup: {
    dateKey: string;
    timeSlotLabel: string;
  };
  paymentStatus: OrderCompletionPaymentStatus;
  paymentMethodLabel: string | null;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    modifiers: Array<{ label: string; quantity?: number }>;
    note?: string;
  }>;
  totalThb: number;
  currency: "THB";
  receipt: OrderCompletionReceiptDto;
  timeline: OrderCompletionTimelineEntryDto[];
};

/** GET /api/orders/history — customer browser-tracked order summaries */
export type OrderHistoryItemDto = {
  orderId: string;
  orderNumber: string;
  status: OrderDto["status"];
  /** Pickup workflow status (same domain status; surfaced for UX). */
  pickupStatus: OrderDto["status"];
  boutiqueName: string;
  pickupDateKey: string;
  pickupTimeSlotLabel: string;
  totalThb: number;
  currency: "THB";
  completedAt: string | null;
  createdAt: string;
};
