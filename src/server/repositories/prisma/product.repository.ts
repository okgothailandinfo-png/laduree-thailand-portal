import type {
  AdminCreateProductInput,
  AdminProductListQuery,
  AdminUpdateProductInput,
} from "@/src/server/admin/dto";
import type { Product } from "@/src/server/models/product";
import type {
  AdminProductListPage,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { toDomainProduct } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";
import { thbMajorToMinor } from "@/src/server/utils/money";
import type { Prisma } from "@prisma/client";

const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
};

function normalizeImages(
  images: AdminCreateProductInput["images"],
): AdminCreateProductInput["images"] {
  if (!images.length) return [];
  const primaryCount = images.filter((image) => image.isPrimary).length;
  if (primaryCount > 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Only one primary image is allowed.",
      { details: { field: "images" } },
    );
  }
  if (primaryCount === 0) {
    return images.map((image, index) => ({
      ...image,
      isPrimary: index === 0,
    }));
  }
  return images;
}

async function resolveImageCreates(
  images: AdminCreateProductInput["images"],
): Promise<
  Array<{
    mediaId: string;
    url: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>
> {
  const normalized = normalizeImages(images);
  if (!normalized.length) return [];

  const mediaIds = [...new Set(normalized.map((image) => image.mediaId))];
  const mediaRows = await prisma.media.findMany({
    where: { id: { in: mediaIds }, isActive: true },
  });
  const byId = new Map(mediaRows.map((row) => [row.id, row]));

  return normalized.map((image, index) => {
    const media = byId.get(image.mediaId);
    if (!media) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Media not found or inactive: ${image.mediaId}`,
        { details: { field: `images[${index}].mediaId` } },
      );
    }
    return {
      mediaId: media.id,
      url: media.url,
      altText: image.altText ?? media.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    };
  });
}

export class PrismaProductRepository implements ProductRepository {
  async list(): Promise<Product[]> {
    const rows = await prisma.product.findMany({
      where: { available: true, isActive: true },
      include: productInclude,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return rows.map(toDomainProduct);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    return row ? toDomainProduct(row) : null;
  }

  async findById(id: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    return row ? toDomainProduct(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({
      where: { sku },
      include: productInclude,
    });
    return row ? toDomainProduct(row) : null;
  }

  async adminList(query: AdminProductListQuery): Promise<AdminProductListPage> {
    const where: Prisma.ProductWhereInput = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.available !== undefined) where.available = query.available;

    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        skip,
        take: query.pageSize,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        product: toDomainProduct(row),
        categoryName: row.category.name,
      })),
    };
  }

  async create(input: AdminCreateProductInput): Promise<Product> {
    const images = await resolveImageCreates(input.images);
    const priceMinor = thbMajorToMinor(input.priceThb);

    try {
      const row = await prisma.product.create({
        data: {
          categoryId: input.categoryId,
          slug: input.slug,
          sku: input.sku,
          title: input.name,
          description: input.description,
          storageLabel: input.storageLabel ?? null,
          storageText: input.storageText ?? null,
          priceMinor,
          currency: input.currency,
          isActive: input.isActive,
          available: input.available,
          sortOrder: input.sortOrder,
          images: {
            create: images.map((image) => ({
              mediaId: image.mediaId,
              url: image.url,
              altText: image.altText,
              sortOrder: image.sortOrder,
              isPrimary: image.isPrimary,
            })),
          },
        },
        include: productInclude,
      });
      return toDomainProduct(row);
    } catch (error) {
      throw mapUniqueConstraint(error);
    }
  }

  async update(
    id: string,
    input: AdminUpdateProductInput,
  ): Promise<Product> {
    const data: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) data.title = input.name;
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.description !== undefined) data.description = input.description;
    if (input.storageLabel !== undefined) {
      data.storageLabel = input.storageLabel ?? null;
    }
    if (input.storageText !== undefined) {
      data.storageText = input.storageText ?? null;
    }
    if (input.priceThb !== undefined) {
      data.priceMinor = thbMajorToMinor(input.priceThb);
    }
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.available !== undefined) data.available = input.available;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.categoryId !== undefined) {
      data.category = { connect: { id: input.categoryId } };
    }

    try {
      if (input.images) {
        const images = await resolveImageCreates(input.images);
        const row = await prisma.$transaction(async (tx) => {
          await tx.productImage.deleteMany({ where: { productId: id } });
          return tx.product.update({
            where: { id },
            data: {
              ...data,
              images: {
                create: images.map((image) => ({
                  mediaId: image.mediaId,
                  url: image.url,
                  altText: image.altText,
                  sortOrder: image.sortOrder,
                  isPrimary: image.isPrimary,
                })),
              },
            },
            include: productInclude,
          });
        });
        return toDomainProduct(row);
      }

      const row = await prisma.product.update({
        where: { id },
        data,
        include: productInclude,
      });
      return toDomainProduct(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Product not found: ${id}`);
      }
      throw mapUniqueConstraint(error);
    }
  }

  async remove(
    id: string,
  ): Promise<{ mode: "deleted" | "deactivated"; product: Product | null }> {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        ...productInclude,
        _count: { select: { orderItems: true } },
      },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", `Product not found: ${id}`);
    }

    if (existing._count.orderItems > 0) {
      const row = await prisma.product.update({
        where: { id },
        data: { isActive: false, available: false },
        include: productInclude,
      });
      return { mode: "deactivated", product: toDomainProduct(row) };
    }

    await prisma.product.delete({ where: { id } });
    return { mode: "deleted", product: null };
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    return prisma.product.count({ where: { categoryId } });
  }
}

function mapUniqueConstraint(error: unknown): never {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    const target = (error as { meta?: { target?: string[] } }).meta?.target;
    if (target?.includes("slug")) {
      throw new AppError("CONFLICT", "Product slug already exists.", {
        details: { field: "slug" },
      });
    }
    if (target?.includes("sku")) {
      throw new AppError("CONFLICT", "Product SKU already exists.", {
        details: { field: "sku" },
      });
    }
    throw new AppError("CONFLICT", "A unique constraint was violated.");
  }
  throw error;
}
