import type {
  AdminCreateProductInput,
  AdminProductDetailDto,
  AdminProductListItemDto,
  AdminProductListQuery,
  AdminProductListResult,
  AdminUpdateProductInput,
} from "@/src/server/admin/dto";
import { MOCK_ADMIN_USER } from "@/lib/admin/session";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import { writeAuditLog } from "@/src/server/audit/audit.service";
import {
  isProductBehavior,
  type ProductBehavior,
} from "@/lib/product/product-behavior";
import type {
  CategoryRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import { parseProductModifierGroups } from "@/src/server/repositories/prisma/product-modifiers";
import {
  optionalString,
  requireBoolean,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be zero or greater.`,
      { details: { field } },
    );
  }
  return value;
}

function requireInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid integer.`, {
      details: { field },
    });
  }
  return value;
}

function requireCurrency(value: unknown): "THB" {
  const currency = requireString(value, "currency");
  if (currency !== "THB") {
    throw new AppError("VALIDATION_ERROR", 'currency must be "THB".', {
      details: { field: "currency" },
    });
  }
  return "THB";
}

function requireProductBehavior(value: unknown, field: string): ProductBehavior {
  if (!isProductBehavior(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a valid productBehavior.`,
      { details: { field } },
    );
  }
  return value;
}

function optionalPackSize(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  const packSize = requireInt(value, field);
  if (packSize <= 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a positive integer when set.`,
      { details: { field } },
    );
  }
  return packSize;
}

function parseImages(raw: unknown): AdminCreateProductInput["images"] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new AppError("VALIDATION_ERROR", "images must be an array.", {
      details: { field: "images" },
    });
  }
  return raw.map((item, index) => {
    const image = requireObject(item, `images[${index}]`);
    return {
      mediaId: requireString(image.mediaId, `images[${index}].mediaId`),
      altText: optionalString(image.altText, `images[${index}].altText`) ?? null,
      sortOrder: requireInt(image.sortOrder ?? index, `images[${index}].sortOrder`),
      isPrimary: requireBoolean(
        image.isPrimary ?? false,
        `images[${index}].isPrimary`,
      ),
    };
  });
}

function parseDescription(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === "") return [];
  if (typeof raw === "string") {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) {
    throw new AppError("VALIDATION_ERROR", "description must be a string or array.", {
      details: { field: "description" },
    });
  }
  return raw.map((line, index) =>
    requireString(line, `description[${index}]`),
  );
}

function toListItem(
  product: Awaited<ReturnType<ProductRepository["findById"]>> extends infer T
    ? NonNullable<T>
    : never,
  categoryName: string,
): AdminProductListItemDto {
  const primary =
    product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  return {
    id: product.id,
    name: product.title,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    categoryName,
    currency: "THB",
    priceThb: product.priceThb,
    priceMinor: product.priceMinor,
    isActive: product.isActive,
    available: product.available,
    deliveryEligible: product.deliveryEligible,
    productBehavior: product.productBehavior,
    packSize: product.packSize,
    sortOrder: product.sortOrder,
    primaryImageUrl: primary?.url ?? null,
  };
}

function toDetail(
  product: NonNullable<Awaited<ReturnType<ProductRepository["findById"]>>>,
  categoryName: string,
): AdminProductDetailDto {
  return {
    ...toListItem(product, categoryName),
    description: [...product.description],
    allergenLabel: product.allergenLabel,
    allergenText: product.allergenText,
    storageLabel: product.storageLabel,
    storageText: product.storageText,
    modifierGroups: product.modifierGroups.map((group) => ({ ...group })),
    images: product.images.map((image) => ({ ...image })),
  };
}

export class AdminProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
  ) {}

  parseListQuery(searchParams: URLSearchParams): AdminProductListQuery {
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10),
    );
    const search = searchParams.get("search")?.trim() || undefined;
    const categoryId = searchParams.get("categoryId")?.trim() || undefined;
    const status = searchParams.get("status");
    const pickup = searchParams.get("available");

    let isActive: boolean | undefined;
    if (status === "active") isActive = true;
    if (status === "inactive") isActive = false;

    let available: boolean | undefined;
    if (pickup === "true") available = true;
    if (pickup === "false") available = false;

    return { search, categoryId, isActive, available, page, pageSize };
  }

  parseCreateBody(raw: unknown): AdminCreateProductInput {
    const body = requireObject(raw, "body");
    const input: AdminCreateProductInput = {
      name: requireString(body.name, "name"),
      slug: requireString(body.slug, "slug"),
      sku: requireString(body.sku, "sku"),
      description: parseDescription(body.description),
      priceThb: requireNonNegativeNumber(body.priceThb, "priceThb"),
      currency: requireCurrency(body.currency ?? "THB"),
      categoryId: requireString(body.categoryId, "categoryId"),
      isActive: requireBoolean(body.isActive ?? true, "isActive"),
      available: requireBoolean(body.available ?? true, "available"),
      deliveryEligible: requireBoolean(
        body.deliveryEligible ?? true,
        "deliveryEligible",
      ),
      productBehavior: requireProductBehavior(
        body.productBehavior ?? "SIMPLE_PRODUCT",
        "productBehavior",
      ),
      packSize: optionalPackSize(body.packSize, "packSize"),
      sortOrder: requireInt(body.sortOrder ?? 0, "sortOrder"),
      storageLabel: optionalString(body.storageLabel, "storageLabel"),
      storageText: optionalString(body.storageText, "storageText"),
      images: parseImages(body.images),
    };
    if (body.allergenLabel !== undefined) {
      input.allergenLabel = optionalString(body.allergenLabel, "allergenLabel");
    }
    if (body.allergenText !== undefined) {
      input.allergenText = optionalString(body.allergenText, "allergenText");
    }
    if (body.modifierGroups !== undefined) {
      if (!Array.isArray(body.modifierGroups)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "modifierGroups must be an array.",
          { details: { field: "modifierGroups" } },
        );
      }
      input.modifierGroups = parseProductModifierGroups(body.modifierGroups);
    }
    return input;
  }

  parseUpdateBody(raw: unknown): AdminUpdateProductInput {
    const body = requireObject(raw, "body");
    const input: AdminUpdateProductInput = {};
    if (body.name !== undefined) input.name = requireString(body.name, "name");
    if (body.slug !== undefined) input.slug = requireString(body.slug, "slug");
    if (body.sku !== undefined) input.sku = requireString(body.sku, "sku");
    if (body.description !== undefined) {
      input.description = parseDescription(body.description);
    }
    if (body.priceThb !== undefined) {
      input.priceThb = requireNonNegativeNumber(body.priceThb, "priceThb");
    }
    if (body.currency !== undefined) {
      input.currency = requireCurrency(body.currency);
    }
    if (body.categoryId !== undefined) {
      input.categoryId = requireString(body.categoryId, "categoryId");
    }
    if (body.isActive !== undefined) {
      input.isActive = requireBoolean(body.isActive, "isActive");
    }
    if (body.available !== undefined) {
      input.available = requireBoolean(body.available, "available");
    }
    if (body.deliveryEligible !== undefined) {
      input.deliveryEligible = requireBoolean(
        body.deliveryEligible,
        "deliveryEligible",
      );
    }
    if (body.productBehavior !== undefined) {
      input.productBehavior = requireProductBehavior(
        body.productBehavior,
        "productBehavior",
      );
    }
    if (body.packSize !== undefined) {
      input.packSize = optionalPackSize(body.packSize, "packSize");
    }
    if (body.sortOrder !== undefined) {
      input.sortOrder = requireInt(body.sortOrder, "sortOrder");
    }
    if (body.storageLabel !== undefined) {
      input.storageLabel = optionalString(body.storageLabel, "storageLabel");
    }
    if (body.storageText !== undefined) {
      input.storageText = optionalString(body.storageText, "storageText");
    }
    if (body.allergenLabel !== undefined) {
      input.allergenLabel = optionalString(body.allergenLabel, "allergenLabel");
    }
    if (body.allergenText !== undefined) {
      input.allergenText = optionalString(body.allergenText, "allergenText");
    }
    if (body.modifierGroups !== undefined) {
      if (!Array.isArray(body.modifierGroups)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "modifierGroups must be an array.",
          { details: { field: "modifierGroups" } },
        );
      }
      input.modifierGroups = parseProductModifierGroups(body.modifierGroups);
    }
    if (body.images !== undefined) input.images = parseImages(body.images);
    return input;
  }

  async list(query: AdminProductListQuery): Promise<AdminProductListResult> {
    requirePrismaDataSource();
    const page = await this.products.adminList(query);
    const totalPages = Math.max(1, Math.ceil(page.total / query.pageSize) || 1);
    return {
      items: page.items.map((row) =>
        toListItem(row.product, row.categoryName),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages,
    };
  }

  async getById(id: string): Promise<AdminProductDetailDto> {
    requirePrismaDataSource();
    const product = await this.products.findById(requireString(id, "id"));
    if (!product) {
      throw new AppError("NOT_FOUND", `Product not found: ${id}`);
    }
    const category = await this.categories.findById(product.categoryId);
    return toDetail(product, category?.name ?? "—");
  }

  async create(input: AdminCreateProductInput): Promise<AdminProductDetailDto> {
    requirePrismaDataSource();
    const category = await this.categories.findById(input.categoryId);
    if (!category) {
      throw new AppError("VALIDATION_ERROR", "Category must exist.", {
        details: { field: "categoryId" },
      });
    }
    const product = await this.products.create(input);
    logger.info("Product created", {
      productId: product.id,
      slug: product.slug,
      sku: product.sku,
    });
    await writeAuditLog({
      actorId: MOCK_ADMIN_USER.id,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      metadata: { slug: product.slug },
    });
    return toDetail(product, category.name);
  }

  async update(
    id: string,
    input: AdminUpdateProductInput,
  ): Promise<AdminProductDetailDto> {
    requirePrismaDataSource();
    const existing = await this.products.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Product not found: ${id}`);
    }
    if (input.categoryId) {
      const category = await this.categories.findById(input.categoryId);
      if (!category) {
        throw new AppError("VALIDATION_ERROR", "Category must exist.", {
          details: { field: "categoryId" },
        });
      }
    }
    const product = await this.products.update(id, input);
    const category = await this.categories.findById(product.categoryId);
    logger.info("Product updated", {
      productId: product.id,
      slug: product.slug,
      isActive: product.isActive,
    });
    await writeAuditLog({
      actorId: MOCK_ADMIN_USER.id,
      action: "product.update",
      entityType: "Product",
      entityId: product.id,
      metadata: { isActive: product.isActive },
    });
    return toDetail(product, category?.name ?? "—");
  }

  async remove(id: string): Promise<{
    mode: "deleted" | "deactivated";
    product: AdminProductDetailDto | null;
  }> {
    requirePrismaDataSource();
    const result = await this.products.remove(requireString(id, "id"));
    if (result.mode === "deactivated" && result.product) {
      const category = await this.categories.findById(result.product.categoryId);
      logger.info("Product deactivated", { productId: id });
      await writeAuditLog({
        actorId: MOCK_ADMIN_USER.id,
        action: "product.deactivate",
        entityType: "Product",
        entityId: id,
        metadata: { mode: "deactivated" },
      });
      return {
        mode: "deactivated",
        product: toDetail(result.product, category?.name ?? "—"),
      };
    }
    logger.info("Product deleted", { productId: id });
    await writeAuditLog({
      actorId: MOCK_ADMIN_USER.id,
      action: "product.deactivate",
      entityType: "Product",
      entityId: id,
      metadata: { mode: "deleted" },
    });
    return { mode: "deleted", product: null };
  }
}
