/** Client-side API types mirroring backend DTOs (no server imports). */

export type ProductBehavior =
  | "CONFIGURABLE_BOX"
  | "FIXED_PACK"
  | "SIMPLE_PRODUCT"
  | "OPTIONAL_CONFIGURABLE";

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
  deliveryEligible: boolean;
  productBehavior: ProductBehavior;
  packSize: number | null;
};

export type ProductModifierOptionDetail = {
  label: string;
  priceMinor?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type ProductModifierGroup = {
  id: string;
  title: string;
  requiredText: string | null;
  type: "quantity" | "radio";
  options: string[];
  optionDetails?: ProductModifierOptionDetail[];
  /** Fixed-size box exact selection (e.g. 8). Null/undefined = no exact rule. */
  exactSelectionQuantity?: number | null;
  required?: boolean;
  minSelection?: number | null;
  maxSelection?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  isAcknowledgement?: boolean;
};

export type ProductDetail = ProductSummary & {
  description: string[];
  allergenLabel: string;
  allergenText: string;
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
  exactSelectionQuantity?: number | null;
  productBehavior?: ProductBehavior | null;
  packSize?: number | null;
  deliveryEligible?: boolean;
  unitPriceThb: number | null;
  unitPriceMinor: number | null;
  lineTotalThb: number | null;
  priceAvailable: boolean;
  productAvailable: boolean;
};

export type Cart = {
  id: string;
  currency: "THB";
  items: CartItem[];
  itemCount: number;
  subtotalThb: number | null;
  pricesAvailable: boolean;
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
    /** Optional pickup recipient override. */
    recipientName?: string;
    /** Optional pickup special request note. */
    specialRequest?: string;
  };
  /** Defaults to PICKUP when omitted. */
  serviceType?: "PICKUP" | "DELIVERY";
  /** Required for PICKUP; must be omitted for DELIVERY. */
  pickup?: {
    boutiqueId: string;
    dateKey: string;
    pickupSlotId: string;
  };
  /** Required when serviceType is DELIVERY. */
  delivery?: {
    mode: "EARLIEST_AVAILABLE" | "PREORDER";
    address: {
      recipient: string;
      phone: string;
      address: string;
      subdistrict: string;
      district: string;
      province: string;
      postalCode: string;
      building?: string;
      unitFloor?: string;
      notes?: string;
    };
    /** Required when mode is PREORDER (future date only). */
    dateKey?: string;
  };
  termsAccepted: boolean;
};

export type CheckoutResponse = {
  orderId: string;
  subtotal: number;
  total: number;
  itemCount: number;
  status: "PENDING";
  serviceType: "PICKUP" | "DELIVERY";
  deliveryMode?: "EARLIEST_AVAILABLE" | "PREORDER" | null;
  deliveryFee: number | null;
  deliveryDateKey?: string | null;
  deliveryTimeWindowLabel?: string | null;
  deliveryPromiseRelativeLabel?: "Today" | "Tomorrow" | null;
  accessToken: string;
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
  serviceType: "PICKUP" | "DELIVERY";
  currency: "THB";
  /** Server-trusted order total in THB major units. */
  totalThb: number;
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    modifiers: Array<{ label: string; quantity?: number }>;
    note?: string;
    productBehavior?: ProductBehavior | null;
    packSize?: number | null;
    exactSelectionQuantity?: number | null;
    deliveryEligible?: boolean | null;
  }>;
  customer: {
    customerName: string;
    mobileNumber: string;
    email: string;
    recipientName?: string;
    recipientPhone?: string;
    specialRequest?: string;
  };
  /** Present for PICKUP orders. */
  pickup?: {
    boutiqueId: string;
    boutiqueName: string;
    address: string;
    dateKey: string;
    timeSlotId: string;
    timeSlotLabel: string;
  };
  delivery?: {
    mode: "EARLIEST_AVAILABLE" | "PREORDER";
    address: {
      recipient: string;
      phone: string;
      address: string;
      subdistrict: string;
      district: string;
      province: string;
      postalCode: string;
      building?: string;
      unitFloor?: string;
      notes?: string;
    };
    feeThb: number | null;
    zoneId?: string | null;
    feeStrategy?: "FLAT_RATE" | "DISTANCE" | null;
    dateKey?: string | null;
    timeSlotId?: string | null;
    timeSlotLabel?: string | null;
    promiseRelativeLabel?: "Today" | "Tomorrow" | null;
  };
  payment?: {
    method: string;
    methodLabel: string;
    status: string;
    safeDisplay?: string | null;
  };
};

/** Customer confirmation pickup credentials (never log qrPayload / pickupCode). */
export type OrderPickupCredentials = {
  pickupCode: string;
  qrPayload: string;
  expiresAt: string | null;
};

export type OrderCompletionPaymentStatus =
  | "pending"
  | "mock_accepted"
  | "failed"
  | "none";

export type OrderCompletionReceiptItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceThb: number;
  lineTotalThb: number;
  modifiers: Array<{ label: string; quantity?: number }>;
};

export type OrderCompletionReceipt = {
  logoUrl: string;
  orderNumber: string;
  boutique: {
    name: string;
    address: string;
  };
  items: OrderCompletionReceiptItem[];
  totalThb: number;
  currency: "THB";
  pickupDateKey: string;
  pickupTimeSlotLabel: string;
  completedAt: string | null;
};

export type OrderCompletionTimelineEntry = {
  status: OrderDetail["status"];
  changedAt: string;
  note: string | null;
};

export type OrderCompletion = {
  orderId: string;
  orderNumber: string;
  status: OrderDetail["status"];
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
  receipt: OrderCompletionReceipt;
  timeline: OrderCompletionTimelineEntry[];
};

export type OrderHistoryItem = {
  orderId: string;
  orderNumber: string;
  status: OrderDetail["status"];
  pickupStatus: OrderDetail["status"];
  serviceType: "PICKUP" | "DELIVERY";
  boutiqueName: string;
  pickupDateKey: string;
  pickupTimeSlotLabel: string;
  paymentMethodLabel: string | null;
  paymentStatus: "pending" | "mock_accepted" | "failed" | "none";
  fulfilmentStatus: OrderDetail["status"];
  totalThb: number;
  currency: "THB";
  completedAt: string | null;
  createdAt: string;
};

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

export type CreatePaymentRequest = {
  orderId: string;
  method: "credit-card" | "promptpay-qr";
  /** Safe display only (e.g. Card ending in 4242). Never send PAN/CVV. */
  safeDisplay?: string | null;
  /** Capability token from checkout — required for payment create. */
  accessToken: string;
};

export type CreatePaymentResponse = {
  paymentId: string;
  paymentUrl: string;
  status: "PENDING";
  method: "credit-card" | "promptpay-qr";
  methodLabel: string;
  accessToken?: string;
  orderNumber?: string | null;
};

export type PaymentRecord = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  paymentUrl: string;
  method: "credit-card" | "promptpay-qr";
  methodLabel: string;
  safeDisplay: string | null;
  createdAt: string;
  updatedAt: string;
  accessToken?: string | null;
  orderNumber?: string | null;
  totalThb?: number | null;
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
  accessToken: string | null;
  orderNumber: string | null;
};
