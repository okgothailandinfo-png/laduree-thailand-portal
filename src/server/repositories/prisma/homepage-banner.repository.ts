import type {
  AdminBannerListQuery,
  AdminCreateBannerInput,
  AdminUpdateBannerInput,
} from "@/src/server/admin/dto";
import type { HomepageBannerWithMedia } from "@/src/server/models/homepage";
import type {
  AdminBannerListPage,
  HomepageBannerRepository,
} from "@/src/server/repositories/interfaces";
import { toDomainHomepageBannerWithMedia } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";
import type { Prisma } from "@prisma/client";

const bannerInclude = {
  imageMedia: true,
  mobileImageMedia: true,
} as const;

export class PrismaHomepageBannerRepository implements HomepageBannerRepository {
  async adminList(query: AdminBannerListQuery): Promise<AdminBannerListPage> {
    const where: Prisma.HomepageBannerWhereInput = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { subtitle: { contains: term, mode: "insensitive" } },
        { linkLabel: { contains: term, mode: "insensitive" } },
        { linkUrl: { contains: term, mode: "insensitive" } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await prisma.$transaction([
      prisma.homepageBanner.count({ where }),
      prisma.homepageBanner.findMany({
        where,
        include: bannerInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
    ]);

    return {
      total,
      items: rows.map(toDomainHomepageBannerWithMedia),
    };
  }

  async findById(id: string): Promise<HomepageBannerWithMedia | null> {
    const row = await prisma.homepageBanner.findUnique({
      where: { id },
      include: bannerInclude,
    });
    return row ? toDomainHomepageBannerWithMedia(row) : null;
  }

  async create(
    input: AdminCreateBannerInput,
  ): Promise<HomepageBannerWithMedia> {
    const row = await prisma.homepageBanner.create({
      data: {
        title: input.title,
        subtitle: input.subtitle ?? null,
        imageMediaId: input.imageMediaId,
        mobileImageMediaId: input.mobileImageMediaId ?? null,
        linkUrl: input.linkUrl ?? null,
        linkLabel: input.linkLabel ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
      include: bannerInclude,
    });
    return toDomainHomepageBannerWithMedia(row);
  }

  async update(
    id: string,
    input: AdminUpdateBannerInput,
  ): Promise<HomepageBannerWithMedia> {
    try {
      const row = await prisma.homepageBanner.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.subtitle !== undefined
            ? { subtitle: input.subtitle ?? null }
            : {}),
          ...(input.imageMediaId !== undefined
            ? { imageMediaId: input.imageMediaId }
            : {}),
          ...(input.mobileImageMediaId !== undefined
            ? { mobileImageMediaId: input.mobileImageMediaId ?? null }
            : {}),
          ...(input.linkUrl !== undefined
            ? { linkUrl: input.linkUrl ?? null }
            : {}),
          ...(input.linkLabel !== undefined
            ? { linkLabel: input.linkLabel ?? null }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.isActive !== undefined
            ? { isActive: input.isActive }
            : {}),
          ...(input.startsAt !== undefined
            ? {
                startsAt: input.startsAt ? new Date(input.startsAt) : null,
              }
            : {}),
          ...(input.endsAt !== undefined
            ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
            : {}),
        },
        include: bannerInclude,
      });
      return toDomainHomepageBannerWithMedia(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Banner not found: ${id}`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await prisma.homepageBanner.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Banner not found: ${id}`);
      }
      throw error;
    }
  }

  async listActiveForStorefront(
    now: Date,
  ): Promise<HomepageBannerWithMedia[]> {
    const rows = await prisma.homepageBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      include: bannerInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toDomainHomepageBannerWithMedia);
  }
}
