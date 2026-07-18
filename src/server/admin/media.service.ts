import type {
  AdminCreateMediaInput,
  AdminMediaDto,
  AdminMediaListQuery,
  AdminMediaListResult,
  AdminUpdateMediaInput,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type { MediaRepository } from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  optionalString,
  requireBoolean,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

function requireUrl(value: unknown, field: string): string {
  const url = requireString(value, field);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid");
    }
    return url;
  } catch {
    if (url.startsWith("/")) return url;
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid URL.`, {
      details: { field },
    });
  }
}

function toDto(media: {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}): AdminMediaDto {
  return { ...media };
}

export class AdminMediaService {
  constructor(private readonly media: MediaRepository) {}

  parseListQuery(searchParams: URLSearchParams): AdminMediaListQuery {
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") ?? "12") || 12),
    );
    const search = searchParams.get("search")?.trim() || undefined;
    const status = searchParams.get("status");
    let isActive: boolean | undefined;
    if (status === "active") isActive = true;
    if (status === "inactive") isActive = false;
    return { search, isActive, page, pageSize };
  }

  parseCreateBody(raw: unknown): AdminCreateMediaInput {
    const body = requireObject(raw, "body");
    return {
      url: requireUrl(body.url, "url"),
      altText: optionalString(body.altText, "altText") ?? null,
      title: optionalString(body.title, "title") ?? null,
      isActive: requireBoolean(body.isActive ?? true, "isActive"),
    };
  }

  parseUpdateBody(raw: unknown): AdminUpdateMediaInput {
    const body = requireObject(raw, "body");
    const input: AdminUpdateMediaInput = {};
    if (body.url !== undefined) input.url = requireUrl(body.url, "url");
    if (body.altText !== undefined) {
      input.altText = optionalString(body.altText, "altText") ?? null;
    }
    if (body.title !== undefined) {
      input.title = optionalString(body.title, "title") ?? null;
    }
    if (body.isActive !== undefined) {
      input.isActive = requireBoolean(body.isActive, "isActive");
    }
    return input;
  }

  async list(query: AdminMediaListQuery): Promise<AdminMediaListResult> {
    requirePrismaDataSource();
    const page = await this.media.adminList(query);
    const totalPages = Math.max(1, Math.ceil(page.total / query.pageSize) || 1);
    return {
      items: page.items.map(toDto),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages,
    };
  }

  async getById(id: string): Promise<AdminMediaDto> {
    requirePrismaDataSource();
    const media = await this.media.findById(requireString(id, "id"));
    if (!media) {
      throw new AppError("NOT_FOUND", `Media not found: ${id}`);
    }
    return toDto(media);
  }

  async create(input: AdminCreateMediaInput): Promise<AdminMediaDto> {
    requirePrismaDataSource();
    const media = await this.media.create(input);
    logger.info("Media created", { mediaId: media.id });
    return toDto(media);
  }

  async update(
    id: string,
    input: AdminUpdateMediaInput,
  ): Promise<AdminMediaDto> {
    requirePrismaDataSource();
    const existing = await this.media.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Media not found: ${id}`);
    }
    const media = await this.media.update(id, input);
    logger.info("Media updated", { mediaId: media.id });
    return toDto(media);
  }

  async remove(id: string): Promise<void> {
    requirePrismaDataSource();
    await this.media.remove(requireString(id, "id"));
    logger.info("Media deleted", { mediaId: id });
  }
}
