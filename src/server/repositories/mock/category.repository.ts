import type { Category } from "@/src/server/models/category";
import type { CategoryRepository } from "@/src/server/repositories/interfaces";
import { MOCK_CATEGORIES } from "@/src/server/repositories/mock/data";

export class MockCategoryRepository implements CategoryRepository {
  async list(): Promise<Category[]> {
    return [...MOCK_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return MOCK_CATEGORIES.find((category) => category.slug === slug) ?? null;
  }
}
