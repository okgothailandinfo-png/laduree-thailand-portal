import type { CategoryRepository } from "@/src/server/repositories/interfaces";
import type { CategoryService } from "@/src/server/services/interfaces";
import { toCategoryDto } from "@/src/server/services/mappers";
import type { CategoryDto } from "@/src/server/types/dto";

export class DefaultCategoryService implements CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  async listCategories(): Promise<CategoryDto[]> {
    const items = await this.categories.list();
    return items.map(toCategoryDto);
  }
}
