import type { Product } from "@/src/server/models/product";
import type { ProductRepository } from "@/src/server/repositories/interfaces";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";

export class MockProductRepository implements ProductRepository {
  async list(): Promise<Product[]> {
    return MOCK_PRODUCTS.filter((product) => product.available);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return MOCK_PRODUCTS.find((product) => product.slug === slug) ?? null;
  }

  async findById(id: string): Promise<Product | null> {
    return MOCK_PRODUCTS.find((product) => product.id === id) ?? null;
  }
}
