import type {
  AdminCategoryDetailDto,
  AdminCategoryListResult,
  AdminCreateCategoryInput,
  AdminCreateProductInput,
  AdminProductDetailDto,
  AdminProductListResult,
  AdminUpdateCategoryInput,
  AdminUpdateProductInput,
} from "@/src/server/admin/dto";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { code: string; status: number; details?: unknown },
  ) {
    super(message);
    this.name = "AdminApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!response.ok || !payload.success) {
    const error = !payload.success
      ? payload.error
      : { code: "INTERNAL_ERROR", message: "Request failed." };
    throw new AdminApiError(error.message, {
      code: error.code,
      status: response.status,
      details: "details" in error ? error.details : undefined,
    });
  }
  return payload.data;
}

export function fetchAdminProducts(params: {
  search?: string;
  categoryId?: string;
  status?: string;
  available?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminProductListResult> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.status) query.set("status", params.status);
  if (params.available) query.set("available", params.available);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));
  return adminFetch(`/api/admin/products?${query.toString()}`);
}

export function fetchAdminProduct(
  id: string,
): Promise<AdminProductDetailDto> {
  return adminFetch(`/api/admin/products/${encodeURIComponent(id)}`);
}

export function createAdminProduct(
  input: AdminCreateProductInput,
): Promise<AdminProductDetailDto> {
  return adminFetch(`/api/admin/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminProduct(
  id: string,
  input: AdminUpdateProductInput,
): Promise<AdminProductDetailDto> {
  return adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAdminProduct(id: string): Promise<{
  mode: "deleted" | "deactivated";
  product: AdminProductDetailDto | null;
}> {
  return adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchAdminCategories(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminCategoryListResult> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));
  return adminFetch(`/api/admin/categories?${query.toString()}`);
}

export function fetchAdminCategory(
  id: string,
): Promise<AdminCategoryDetailDto> {
  return adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`);
}

export function createAdminCategory(
  input: AdminCreateCategoryInput,
): Promise<AdminCategoryDetailDto> {
  return adminFetch(`/api/admin/categories`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminCategory(
  id: string,
  input: AdminUpdateCategoryInput,
): Promise<AdminCategoryDetailDto> {
  return adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAdminCategory(id: string): Promise<{ deleted: boolean }> {
  return adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
