import type { Category } from "@/src/server/models/category";
import type {
  AdminCategoryListPage,
  CategoryRepository,
} from "@/src/server/repositories/interfaces";
import { MOCK_CATEGORIES } from "@/src/server/repositories/mock/data";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin catalog operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

export class MockCategoryRepository implements CategoryRepository {
  async list(): Promise<Category[]> {
    return [...MOCK_CATEGORIES]
      .filter((category) => category.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return MOCK_CATEGORIES.find((category) => category.slug === slug) ?? null;
  }

  async findById(id: string): Promise<Category | null> {
    return MOCK_CATEGORIES.find((category) => category.id === id) ?? null;
  }

  async adminList(): Promise<AdminCategoryListPage> {
    rejectAdmin();
  }

  async create(): Promise<Category> {
    rejectAdmin();
  }

  async update(): Promise<Category> {
    rejectAdmin();
  }

  async remove(): Promise<void> {
    rejectAdmin();
  }
}
