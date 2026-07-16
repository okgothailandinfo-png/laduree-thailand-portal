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
