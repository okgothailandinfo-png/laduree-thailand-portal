import type {
  AdminBannerDto,
  AdminBannerListQuery,
  AdminBannerListResult,
  AdminCreateBannerInput,
  AdminUpdateBannerInput,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type { HomepageBannerWithMedia } from "@/src/server/models/homepage";
import type { Media } from "@/src/server/models/media";
import type {
  HomepageBannerRepository,
  MediaRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  optionalString,
  requireBoolean,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

const IMAGE_EXT = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|$)/i;

function requireInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid integer.`, {
      details: { field },
    });
  }
  return value;
}

function optionalDateIso(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${field} must be an ISO date string.`, {
      details: { field },
    });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid date.`, {
      details: { field },
    });
  }
  return parsed.toISOString();
}

/** Safe link: internal path or http(s). Reject javascript: and other schemes. */
function optionalSafeLinkUrl(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const url = requireString(value, field);
  const lower = url.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    throw new AppError("VALIDATION_ERROR", `${field} uses an unsafe URL scheme.`, {
      details: { field },
    });
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid");
    }
    return url;
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a valid http(s) URL or internal path.`,
      { details: { field } },
    );
  }
}

function isImageMedia(media: Media): boolean {
  if (media.mimeType) {
    return media.mimeType.toLowerCase().startsWith("image/");
  }
  return IMAGE_EXT.test(media.url);
}

function assertSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  if (startsAt && endsAt) {
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (start >= end) {
      throw new AppError(
        "VALIDATION_ERROR",
        "startsAt must be before endsAt.",
        { details: { field: "startsAt" } },
      );
    }
  }
}

function toDto(banner: HomepageBannerWithMedia): AdminBannerDto {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    imageMediaId: banner.imageMediaId,
    imageUrl: banner.imageUrl,
    imageAltText: banner.imageAltText,
    mobileImageMediaId: banner.mobileImageMediaId,
    mobileImageUrl: banner.mobileImageUrl,
    mobileImageAltText: banner.mobileImageAltText,
    linkUrl: banner.linkUrl,
    linkLabel: banner.linkLabel,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt,
  };
}

export class AdminBannerService {
  constructor(
    private readonly banners: HomepageBannerRepository,
    private readonly media: MediaRepository,
  ) {}

  parseListQuery(searchParams: URLSearchParams): AdminBannerListQuery {
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

  parseCreateBody(raw: unknown): AdminCreateBannerInput {
    const body = requireObject(raw, "body");
    const startsAt = optionalDateIso(body.startsAt, "startsAt") ?? null;
    const endsAt = optionalDateIso(body.endsAt, "endsAt") ?? null;
    assertSchedule(startsAt, endsAt);
    return {
      title: requireString(body.title, "title"),
      subtitle: optionalString(body.subtitle, "subtitle") ?? null,
      imageMediaId: requireString(body.imageMediaId, "imageMediaId"),
      mobileImageMediaId:
        optionalString(body.mobileImageMediaId, "mobileImageMediaId") ?? null,
      linkUrl: optionalSafeLinkUrl(body.linkUrl, "linkUrl") ?? null,
      linkLabel: optionalString(body.linkLabel, "linkLabel") ?? null,
      sortOrder: requireInt(body.sortOrder ?? 0, "sortOrder"),
      isActive: requireBoolean(body.isActive ?? true, "isActive"),
      startsAt,
      endsAt,
    };
  }

  parseUpdateBody(raw: unknown): AdminUpdateBannerInput {
    const body = requireObject(raw, "body");
    const input: AdminUpdateBannerInput = {};
    if (body.title !== undefined) input.title = requireString(body.title, "title");
    if (body.subtitle !== undefined) {
      input.subtitle = optionalString(body.subtitle, "subtitle") ?? null;
    }
    if (body.imageMediaId !== undefined) {
      input.imageMediaId = requireString(body.imageMediaId, "imageMediaId");
    }
    if (body.mobileImageMediaId !== undefined) {
      input.mobileImageMediaId =
        optionalString(body.mobileImageMediaId, "mobileImageMediaId") ?? null;
    }
    if (body.linkUrl !== undefined) {
      input.linkUrl = optionalSafeLinkUrl(body.linkUrl, "linkUrl") ?? null;
    }
    if (body.linkLabel !== undefined) {
      input.linkLabel = optionalString(body.linkLabel, "linkLabel") ?? null;
    }
    if (body.sortOrder !== undefined) {
      input.sortOrder = requireInt(body.sortOrder, "sortOrder");
    }
    if (body.isActive !== undefined) {
      input.isActive = requireBoolean(body.isActive, "isActive");
    }
    if (body.startsAt !== undefined) {
      input.startsAt = optionalDateIso(body.startsAt, "startsAt") ?? null;
    }
    if (body.endsAt !== undefined) {
      input.endsAt = optionalDateIso(body.endsAt, "endsAt") ?? null;
    }
    return input;
  }

  private async assertImageMedia(mediaId: string, field: string): Promise<Media> {
    const media = await this.media.findById(mediaId);
    if (!media) {
      throw new AppError("VALIDATION_ERROR", `${field} must reference existing media.`, {
        details: { field },
      });
    }
    if (!media.isActive) {
      throw new AppError("VALIDATION_ERROR", `${field} must reference active media.`, {
        details: { field },
      });
    }
    if (!isImageMedia(media)) {
      throw new AppError("VALIDATION_ERROR", `${field} must reference image media.`, {
        details: { field },
      });
    }
    return media;
  }

  private async validateMediaRefs(input: {
    imageMediaId?: string;
    mobileImageMediaId?: string | null;
  }): Promise<void> {
    if (input.imageMediaId) {
      await this.assertImageMedia(input.imageMediaId, "imageMediaId");
    }
    if (input.mobileImageMediaId) {
      await this.assertImageMedia(input.mobileImageMediaId, "mobileImageMediaId");
    }
  }

  async list(query: AdminBannerListQuery): Promise<AdminBannerListResult> {
    requirePrismaDataSource();
    const page = await this.banners.adminList(query);
    const totalPages = Math.max(1, Math.ceil(page.total / query.pageSize) || 1);
    return {
      items: page.items.map(toDto),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages,
    };
  }

  async getById(id: string): Promise<AdminBannerDto> {
    requirePrismaDataSource();
    const banner = await this.banners.findById(requireString(id, "id"));
    if (!banner) {
      throw new AppError("NOT_FOUND", `Banner not found: ${id}`);
    }
    return toDto(banner);
  }

  async create(input: AdminCreateBannerInput): Promise<AdminBannerDto> {
    requirePrismaDataSource();
    await this.validateMediaRefs(input);
    const banner = await this.banners.create(input);
    logger.info("Banner created", { bannerId: banner.id });
    return toDto(banner);
  }

  async update(
    id: string,
    input: AdminUpdateBannerInput,
  ): Promise<AdminBannerDto> {
    requirePrismaDataSource();
    const existing = await this.banners.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Banner not found: ${id}`);
    }

    const nextStartsAt =
      input.startsAt !== undefined ? input.startsAt : existing.startsAt;
    const nextEndsAt =
      input.endsAt !== undefined ? input.endsAt : existing.endsAt;
    assertSchedule(nextStartsAt, nextEndsAt);

    await this.validateMediaRefs({
      imageMediaId: input.imageMediaId,
      mobileImageMediaId: input.mobileImageMediaId,
    });

    const banner = await this.banners.update(id, input);
    logger.info("Banner updated", {
      bannerId: banner.id,
      isActive: banner.isActive,
    });
    return toDto(banner);
  }

  async remove(id: string): Promise<void> {
    requirePrismaDataSource();
    const existing = await this.banners.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Banner not found: ${id}`);
    }
    await this.banners.remove(id);
    logger.info("Banner deleted", { bannerId: id });
  }
}
