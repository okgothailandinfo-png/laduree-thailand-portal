import type {
  AdminCategoryListQuery,
  AdminCreateCategoryInput,
  AdminUpdateCategoryInput,
} from "@/src/server/admin/dto";
import type { Category } from "@/src/server/models/category";
import type {
  AdminCategoryListPage,
  CategoryRepository,
} from "@/src/server/repositories/interfaces";
import { toDomainCategory } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";
import type { Prisma } from "@prisma/client";

export class PrismaCategoryRepository implements CategoryRepository {
  async list(): Promise<Category[]> {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toDomainCategory);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const row = await prisma.category.findUnique({ where: { slug } });
    return row ? toDomainCategory(row) : null;
  }

  async findById(id: string): Promise<Category | null> {
    const row = await prisma.category.findUnique({ where: { id } });
    return row ? toDomainCategory(row) : null;
  }

  async adminList(
    query: AdminCategoryListQuery,
  ): Promise<AdminCategoryListPage> {
    const where: Prisma.CategoryWhereInput = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await prisma.$transaction([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip,
        take: query.pageSize,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        category: toDomainCategory(row),
        productCount: row._count.products,
      })),
    };
  }

  async create(input: AdminCreateCategoryInput): Promise<Category> {
    try {
      const row = await prisma.category.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
      });
      return toDomainCategory(row);
    } catch (error) {
      throw mapUniqueConstraint(error);
    }
  }

  async update(
    id: string,
    input: AdminUpdateCategoryInput,
  ): Promise<Category> {
    try {
      const row = await prisma.category.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined
            ? { description: input.description ?? null }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
      return toDomainCategory(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Category not found: ${id}`);
      }
      throw mapUniqueConstraint(error);
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", `Category not found: ${id}`);
    }
    if (existing._count.products > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete a category that contains products.",
        { details: { productCount: existing._count.products } },
      );
    }
    await prisma.category.delete({ where: { id } });
  }
}

function mapUniqueConstraint(error: unknown): never {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    throw new AppError("CONFLICT", "Category slug already exists.", {
      details: { field: "slug" },
    });
  }
  throw error;
}
