import { apiGet } from "@/lib/api/client";
import type {
  Boutique,
  Category,
  ProductDetail,
  ProductSummary,
} from "@/lib/api/types";

export function fetchCategories(init?: RequestInit) {
  return apiGet<Category[]>("/api/categories", init);
}

export function fetchProducts(init?: RequestInit) {
  return apiGet<ProductSummary[]>("/api/products", init);
}

export function fetchProductBySlug(slug: string, init?: RequestInit) {
  return apiGet<ProductDetail>(
    `/api/products/${encodeURIComponent(slug)}`,
    init,
  );
}

export function fetchBoutiques(init?: RequestInit) {
  return apiGet<Boutique[]>("/api/boutiques", init);
}

export function formatPriceThb(priceThb: number | null): string {
  if (priceThb === null || Number.isNaN(priceThb)) return "฿ —";
  return `฿${priceThb.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}
