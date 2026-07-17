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
  storageLabel: string;
  storageText: string;
  modifierGroups: ProductModifierGroupDto[];
};

export type ProductModifierGroupDto = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
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
};

export type CartDto = {
  id: string;
  currency: "THB";
  items: CartItemDto[];
  itemCount: number;
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
  status: "pending" | "mock_placed";
  currency: "THB";
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
  pickupSlotId: string;
};

export type CheckoutRequestDto = {
  customer: CheckoutCustomerRequestDto;
  pickup: CheckoutPickupRequestDto;
};

export type CheckoutResponseDto = {
  orderId: string;
  subtotal: number;
  total: number;
  itemCount: number;
  status: "PENDING";
};
