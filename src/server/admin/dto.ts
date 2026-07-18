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

