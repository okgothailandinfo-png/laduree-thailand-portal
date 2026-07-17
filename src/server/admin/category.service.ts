import type {
  AdminCategoryDetailDto,
  AdminCategoryListQuery,
  AdminCategoryListResult,
  AdminCreateCategoryInput,
  AdminUpdateCategoryInput,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type {
  CategoryRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  optionalString,
  requireBoolean,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

function requireInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid integer.`, {
      details: { field },
    });
  }
  return value;
}

function toDetail(
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
  },
  productCount: number,
): AdminCategoryDetailDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    productCount,
  };
}

export class AdminCategoryService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
  ) {}

  parseListQuery(searchParams: URLSearchParams): AdminCategoryListQuery {
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10),
    );
    const search = searchParams.get("search")?.trim() || undefined;
    const status = searchParams.get("status");
    let isActive: boolean | undefined;
    if (status === "active") isActive = true;
    if (status === "inactive") isActive = false;
    return { search, isActive, page, pageSize };
  }

  parseCreateBody(raw: unknown): AdminCreateCategoryInput {
    const body = requireObject(raw, "body");
    return {
      name: requireString(body.name, "name"),
      slug: requireString(body.slug, "slug"),
      description: optionalString(body.description, "description") ?? null,
      sortOrder: requireInt(body.sortOrder ?? 0, "sortOrder"),
      isActive: requireBoolean(body.isActive ?? true, "isActive"),
    };
  }

  parseUpdateBody(raw: unknown): AdminUpdateCategoryInput {
    const body = requireObject(raw, "body");
    const input: AdminUpdateCategoryInput = {};
    if (body.name !== undefined) input.name = requireString(body.name, "name");
    if (body.slug !== undefined) input.slug = requireString(body.slug, "slug");
    if (body.description !== undefined) {
      input.description =
        optionalString(body.description, "description") ?? null;
    }
    if (body.sortOrder !== undefined) {
      input.sortOrder = requireInt(body.sortOrder, "sortOrder");
    }
    if (body.isActive !== undefined) {
      input.isActive = requireBoolean(body.isActive, "isActive");
    }
    return input;
  }

  async list(query: AdminCategoryListQuery): Promise<AdminCategoryListResult> {
    requirePrismaDataSource();
    const page = await this.categories.adminList(query);
    const totalPages = Math.max(1, Math.ceil(page.total / query.pageSize) || 1);
    return {
      items: page.items.map((row) =>
        toDetail(row.category, row.productCount),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages,
    };
  }

  async getById(id: string): Promise<AdminCategoryDetailDto> {
    requirePrismaDataSource();
    const category = await this.categories.findById(requireString(id, "id"));
    if (!category) {
      throw new AppError("NOT_FOUND", `Category not found: ${id}`);
    }
    const productCount = await this.products.countByCategoryId(category.id);
    return toDetail(category, productCount);
  }

  async create(
    input: AdminCreateCategoryInput,
  ): Promise<AdminCategoryDetailDto> {
    requirePrismaDataSource();
    const category = await this.categories.create(input);
    logger.info("Category created", {
      categoryId: category.id,
      slug: category.slug,
    });
    return toDetail(category, 0);
  }

  async update(
    id: string,
    input: AdminUpdateCategoryInput,
  ): Promise<AdminCategoryDetailDto> {
    requirePrismaDataSource();
    const existing = await this.categories.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Category not found: ${id}`);
    }
    const category = await this.categories.update(id, input);
    const productCount = await this.products.countByCategoryId(category.id);
    logger.info("Category updated", {
      categoryId: category.id,
      slug: category.slug,
      isActive: category.isActive,
    });
    return toDetail(category, productCount);
  }

  async remove(id: string): Promise<void> {
    requirePrismaDataSource();
    await this.categories.remove(requireString(id, "id"));
    logger.info("Category deleted", { categoryId: id });
  }
}
