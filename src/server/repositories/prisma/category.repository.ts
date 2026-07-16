import type { Category } from "@/src/server/models/category";
import type { CategoryRepository } from "@/src/server/repositories/interfaces";
import { toDomainCategory } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";

export class PrismaCategoryRepository implements CategoryRepository {
  async list(): Promise<Category[]> {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toDomainCategory);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const row = await prisma.category.findUnique({ where: { slug } });
    return row ? toDomainCategory(row) : null;
  }
}
