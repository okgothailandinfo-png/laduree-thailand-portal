/** Admin catalog DTOs — separate from storefront contracts. */

export type AdminMediaDto = {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
  isActive: boolean;
  originalFileName: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  storageProvider: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Response from POST /api/admin/media/upload */
export type AdminMediaUploadResult = {
  mediaId: string;
  url: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type AdminMediaListQuery = {
  search?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

export type AdminMediaListResult = {
  items: AdminMediaDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateMediaInput = {
  url: string;
  altText?: string | null;
  title?: string | null;
  isActive: boolean;
  /** Upload metadata — omitted for URL-only create. */
  originalFileName?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  storageProvider?: string | null;
};

export type AdminUpdateMediaInput = Partial<AdminCreateMediaInput>;

/** Product images reference Media by ID only (URL resolved from Media). */
export type AdminProductImageInput = {
  mediaId: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type AdminProductImageDto = {
  id: string;
  mediaId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type AdminProductListItemDto = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  currency: "THB";
  priceThb: number | null;
  priceMinor: number | null;
  isActive: boolean;
  available: boolean;
  sortOrder: number;
  primaryImageUrl: string | null;
};

export type AdminProductDetailDto = AdminProductListItemDto & {
  description: string[];
  storageLabel: string;
  storageText: string;
  images: AdminProductImageDto[];
};

export type AdminProductListQuery = {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  available?: boolean;
  page: number;
  pageSize: number;
};

export type AdminProductListResult = {
  items: AdminProductListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateProductInput = {
  name: string;
  slug: string;
  sku: string;
  description: string[];
  priceThb: number;
  currency: "THB";
  categoryId: string;
  isActive: boolean;
  available: boolean;
  sortOrder: number;
  storageLabel?: string;
  storageText?: string;
  images: AdminProductImageInput[];
};

export type AdminUpdateProductInput = Partial<AdminCreateProductInput>;

export type AdminCategoryListItemDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
};

export type AdminCategoryDetailDto = AdminCategoryListItemDto;

export type AdminCategoryListQuery = {
  search?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

export type AdminCategoryListResult = {
  items: AdminCategoryListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateCategoryInput = {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type AdminUpdateCategoryInput = Partial<AdminCreateCategoryInput>;

/** Homepage CMS — banners, sections, keyed content. */

export type HomepageContentTypeDto =
  | "plain_text"
  | "multiline_text"
  | "url"
  | "boolean";

export type AdminBannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  imageMediaId: string;
  imageUrl: string;
  imageAltText: string | null;
  mobileImageMediaId: string | null;
  mobileImageUrl: string | null;
  mobileImageAltText: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminBannerListQuery = {
  search?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

export type AdminBannerListResult = {
  items: AdminBannerDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateBannerInput = {
  title: string;
  subtitle?: string | null;
  imageMediaId: string;
  mobileImageMediaId?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type AdminUpdateBannerInput = Partial<AdminCreateBannerInput>;

export type AdminHomepageSectionDto = {
  id: string;
  key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCreateHomepageSectionInput = {
  key: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type AdminUpdateHomepageSectionInput =
  Partial<AdminCreateHomepageSectionInput>;

export type AdminHomepageContentDto = {
  id: string;
  key: string;
  value: string;
  contentType: HomepageContentTypeDto;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCreateHomepageContentInput = {
  key: string;
  value: string;
  contentType: HomepageContentTypeDto;
  isActive: boolean;
};

export type AdminUpdateHomepageContentInput =
  Partial<AdminCreateHomepageContentInput>;

/** Admin order management */

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "mock_placed";

export type AdminPaymentStatus =
  | "pending"
  | "mock_accepted"
  | "failed"
  | "none";

export type AdminOrderListItemDto = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  boutiqueId: string;
  boutiqueName: string;
  pickupDate: string;
  pickupTime: string;
  itemCount: number;
  currency: "THB";
  totalMinor: number;
  totalThb: number;
  paymentStatus: AdminPaymentStatus;
  orderStatus: AdminOrderStatus;
  createdAt: string;
};

export type AdminOrderListQuery = {
  search?: string;
  status?: AdminOrderStatus;
  paymentStatus?: Exclude<AdminPaymentStatus, "none">;
  boutiqueId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export type AdminOrderListResult = {
  items: AdminOrderListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminOrderItemDto = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  unitPriceThb: number;
  lineTotalMinor: number;
  lineTotalThb: number;
  currency: "THB";
  modifiers: Array<{ label: string; quantity?: number }>;
  note: string | null;
};

export type AdminOrderHistoryDto = {
  id: string;
  fromStatus: AdminOrderStatus | null;
  toStatus: AdminOrderStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
};

export type AdminOrderDetailDto = {
  id: string;
  orderNumber: string;
  orderStatus: AdminOrderStatus;
  allowedNextStatuses: AdminOrderStatus[];
  paymentStatus: AdminPaymentStatus;
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
  /** Safe payment record id — never card/CVV/secrets. */
  paymentReference: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    recipientName: string | null;
    recipientPhone: string | null;
  };
  boutique: {
    id: string;
    name: string;
    code: string;
    address: string;
  };
  pickup: {
    date: string;
    time: string;
    slotId: string;
  };
  items: AdminOrderItemDto[];
  notes: string | null;
  subtotalMinor: number;
  subtotalThb: number;
  taxMinor: number | null;
  taxThb: number | null;
  totalMinor: number;
  totalThb: number;
  currency: "THB";
  createdAt: string;
  updatedAt: string;
  history: AdminOrderHistoryDto[];
};

export type AdminUpdateOrderStatusInput = {
  status: AdminOrderStatus;
  note?: string | null;
};
