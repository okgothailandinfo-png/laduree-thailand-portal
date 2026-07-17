/** Admin catalog DTOs — separate from storefront contracts. */

export type AdminProductImageInput = {
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type AdminProductImageDto = {
  id: string;
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
