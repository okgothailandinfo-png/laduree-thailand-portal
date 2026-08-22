import type { Product } from "@/src/server/models/product";
import type {
  AdminProductListPage,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";
import { isThailandMasterSku } from "@/lib/catalog/thailand-product-import";
import { isStorefrontPdpVisible } from "@/lib/catalog/storefront-visibility";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin catalog operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

function isProductionAppEnv(): boolean {
  return process.env.APP_ENV === "production";
}

/**
 * Storefront listing.
 * Production: only active + available.
 * Safe-Draft (non-production): also include Thailand LDR Draft rows for catalog QA
 * while cart/checkout remain fail-closed (inactive / unavailable / null price).
 */
function listForStorefront(): Product[] {
  if (isProductionAppEnv()) {
    return MOCK_PRODUCTS.filter(
      (product) => product.available && product.isActive,
    );
  }
  return MOCK_PRODUCTS.filter(
    (product) =>
      (product.available && product.isActive) ||
      isThailandMasterSku(product.sku),
  );
}

export class MockProductRepository implements ProductRepository {
  async list(): Promise<Product[]> {
    return listForStorefront();
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const product =
      MOCK_PRODUCTS.find((item) => item.slug === slug) ?? null;
    if (!product || !isStorefrontPdpVisible(product)) return null;
    return product;
  }

  async findById(id: string): Promise<Product | null> {
    return MOCK_PRODUCTS.find((product) => product.id === id) ?? null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    return MOCK_PRODUCTS.find((product) => product.sku === sku) ?? null;
  }

  async adminList(): Promise<AdminProductListPage> {
    rejectAdmin();
  }

  async create(): Promise<Product> {
    rejectAdmin();
  }

  async update(): Promise<Product> {
    rejectAdmin();
  }

  async remove(): Promise<{
    mode: "deleted" | "deactivated";
    product: Product | null;
  }> {
    rejectAdmin();
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    return MOCK_PRODUCTS.filter((product) => product.categoryId === categoryId)
      .length;
  }
}
