import type { Product } from "@/src/server/models/product";
import type {
  AdminProductListPage,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin catalog operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

export class MockProductRepository implements ProductRepository {
  async list(): Promise<Product[]> {
    return MOCK_PRODUCTS.filter(
      (product) => product.available && product.isActive,
    );
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return MOCK_PRODUCTS.find((product) => product.slug === slug) ?? null;
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
