/** Client-side API types mirroring backend DTOs (no server imports). */

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  currency: "THB";
  priceThb: number | null;
  imagePlaceholder: string;
  available: boolean;
};

export type ProductModifierGroup = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
};

export type ProductDetail = ProductSummary & {
  description: string[];
  storageLabel: string;
  storageText: string;
  modifierGroups: ProductModifierGroup[];
};

export type Boutique = {
  id: string;
  name: string;
  code: string;
  address: string;
  openingHours: string;
  lastOrderTime: string;
};

/** Public homepage API contract (GET /api/homepage). */
export type HomepageBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
};

export type HomepageSection = {
  key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  sortOrder: number;
};

export type HomepageContentItem = {
  key: string;
  value: string;
  contentType: "plain_text" | "multiline_text" | "url" | "boolean";
};

export type HomepagePayload = {
  banners: HomepageBanner[];
  sections: HomepageSection[];
  content: HomepageContentItem[];
};

export type PickupTimeSlot = {
  id: string;
  label: string;
  start: string;
  end: string;
};

export type PickupAvailability = {
  boutiqueId: string;
  dateKey: string;
  timezone: string;
  slots: PickupTimeSlot[];
};

export type CartModifier = {
  label: string;
  quantity?: number;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  imageSrc: string;
  quantity: number;
  modifiers: CartModifier[];
  note?: string;
};

export type Cart = {
  id: string;
  currency: "THB";
  items: CartItem[];
  itemCount: number;
};

export type AddCartItemRequest = {
  productId: string;
  quantity: number;
  modifiers?: CartModifier[];
  note?: string;
};

export type UpdateCartItemRequest = {
  quantity: number;
};

export type CheckoutRequest = {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  pickup: {
    boutiqueId: string;
    pickupSlotId: string;
  };
};

export type CheckoutResponse = {
  orderId: string;
  subtotal: number;
  total: number;
  itemCount: number;
  status: "PENDING";
};

export type OrderDetail = {
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
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    modifiers: Array<{ label: string; quantity?: number }>;
    note?: string;
  }>;
  customer: {
    customerName: string;
    mobileNumber: string;
    email: string;
    recipientName?: string;
    recipientPhone?: string;
    specialRequest?: string;
  };
  pickup: {
    boutiqueId: string;
    boutiqueName: string;
    address: string;
    dateKey: string;
    timeSlotId: string;
    timeSlotLabel: string;
  };
  payment?: {
    method: string;
    methodLabel: string;
    status: string;
  };
};

/** Customer confirmation pickup credentials (never log qrPayload / pickupCode). */
export type OrderPickupCredentials = {
  pickupCode: string;
  qrPayload: string;
  expiresAt: string | null;
};

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type CreatePaymentRequest = {
  orderId: string;
};

export type CreatePaymentResponse = {
  paymentId: string;
  paymentUrl: string;
  status: "PENDING";
};

export type PaymentRecord = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  paymentUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type ConfirmPaymentRequest = {
  paymentId: string;
  result: "SUCCESS" | "FAILED";
};

export type ConfirmPaymentResponse = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  orderStatus:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "completed"
    | "cancelled"
    | "mock_placed";
};
