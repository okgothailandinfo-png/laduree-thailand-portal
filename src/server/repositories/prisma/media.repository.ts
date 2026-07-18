import type {
  AdminCreateMediaInput,
  AdminMediaListQuery,
  AdminUpdateMediaInput,
} from "@/src/server/admin/dto";
import type { Media } from "@/src/server/models/media";
import type {
  AdminMediaListPage,
  MediaRepository,
} from "@/src/server/repositories/interfaces";
import { toDomainMedia } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";
import type { Prisma } from "@prisma/client";

export class PrismaMediaRepository implements MediaRepository {
  async findById(id: string): Promise<Media | null> {
    const row = await prisma.media.findUnique({ where: { id } });
    return row ? toDomainMedia(row) : null;
  }

  async findByIds(ids: string[]): Promise<Media[]> {
    if (!ids.length) return [];
    const rows = await prisma.media.findMany({
      where: { id: { in: ids } },
    });
    return rows.map(toDomainMedia);
  }

  async adminList(query: AdminMediaListQuery): Promise<AdminMediaListPage> {
    const where: Prisma.MediaWhereInput = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { url: { contains: term, mode: "insensitive" } },
        { title: { contains: term, mode: "insensitive" } },
        { altText: { contains: term, mode: "insensitive" } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await prisma.$transaction([
      prisma.media.count({ where }),
      prisma.media.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
    ]);

    return { total, items: rows.map(toDomainMedia) };
  }

  async create(input: AdminCreateMediaInput): Promise<Media> {
    const row = await prisma.media.create({
      data: {
        url: input.url,
        altText: input.altText ?? null,
        title: input.title ?? null,
        isActive: input.isActive,
        originalFileName: input.originalFileName ?? null,
        fileName: input.fileName ?? null,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        storageProvider: input.storageProvider ?? null,
      },
    });
    return toDomainMedia(row);
  }

  async update(id: string, input: AdminUpdateMediaInput): Promise<Media> {
    try {
      const row = await prisma.media.update({
        where: { id },
        data: {
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.altText !== undefined
            ? { altText: input.altText ?? null }
            : {}),
          ...(input.title !== undefined ? { title: input.title ?? null } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      // Keep denormalized ProductImage.url in sync when Media URL changes.
      if (input.url !== undefined) {
        await prisma.productImage.updateMany({
          where: { mediaId: id },
          data: { url: input.url },
        });
      }

      return toDomainMedia(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Media not found: ${id}`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await prisma.media.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productImages: true,
            bannerDesktopImages: true,
            bannerMobileImages: true,
          },
        },
      },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", `Media not found: ${id}`);
    }
    if (existing._count.productImages > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete media that is linked to products.",
        { details: { productImageCount: existing._count.productImages } },
      );
    }
    const bannerLinkCount =
      existing._count.bannerDesktopImages + existing._count.bannerMobileImages;
    if (bannerLinkCount > 0) {
      throw new AppError(
        "CONFLICT",
        "Cannot delete media that is linked to homepage banners.",
        { details: { bannerLinkCount } },
      );
    }
    await prisma.media.delete({ where: { id } });
  }

  async countProductLinks(mediaId: string): Promise<number> {
    return prisma.productImage.count({ where: { mediaId } });
  }

  async countBannerLinks(mediaId: string): Promise<number> {
    const [desktop, mobile] = await prisma.$transaction([
      prisma.homepageBanner.count({ where: { imageMediaId: mediaId } }),
      prisma.homepageBanner.count({ where: { mobileImageMediaId: mediaId } }),
    ]);
    return desktop + mobile;
  }
}
