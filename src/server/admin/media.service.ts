import type {
  AdminCreateMediaInput,
  AdminMediaDto,
  AdminMediaListQuery,
  AdminMediaListResult,
  AdminMediaUploadResult,
  AdminUpdateMediaInput,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type { MediaRepository } from "@/src/server/repositories/interfaces";
import type { StorageService } from "@/src/server/storage/storage-service";
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
  originalFileName: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  storageProvider: string | null;
  createdAt: string;
  updatedAt: string;
}): AdminMediaDto {
  return { ...media };
}

export class AdminMediaService {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: StorageService,
  ) {}

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

  /**
   * Binary image upload → storage provider → Media record.
   * On DB failure after a successful file write, the stored object is deleted.
   */
  async upload(formData: FormData): Promise<AdminMediaUploadResult> {
    requirePrismaDataSource();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "file is required.", {
        details: { field: "file" },
      });
    }

    const title = optionalString(formData.get("title"), "title") ?? null;
    const altText = optionalString(formData.get("altText"), "altText") ?? null;
    const folderRaw = formData.get("folder");
    const folder =
      folderRaw == null || folderRaw === ""
        ? null
        : optionalString(folderRaw, "folder");

    const buffer = Buffer.from(await file.arrayBuffer());
    let uploadedKey: string | null = null;

    try {
      const stored = await this.storage.uploadImage({
        buffer,
        declaredMimeType: file.type || "",
        originalFileName: file.name || "upload",
        folder,
      });
      uploadedKey = stored.storageKey;

      const media = await this.media.create({
        url: stored.publicUrl,
        title,
        altText,
        isActive: true,
        originalFileName: stored.originalFileName,
        fileName: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        width: stored.width,
        height: stored.height,
        storageProvider: this.storage.providerName,
      });

      logger.info("Media upload succeeded", {
        mediaId: media.id,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: this.storage.providerName,
      });

      return {
        mediaId: media.id,
        url: media.url,
        fileName: stored.fileName,
        originalFileName: stored.originalFileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        width: stored.width,
        height: stored.height,
        createdAt: media.createdAt,
      };
    } catch (error) {
      if (uploadedKey) {
        try {
          await this.storage.delete(uploadedKey);
        } catch (cleanupError) {
          logger.error("Media upload cleanup failed after DB error", {
            storageKey: uploadedKey,
            message:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          });
        }
      }

      logger.warn("Media upload failed", {
        message: error instanceof Error ? error.message : String(error),
        mimeType: file.type || null,
        sizeBytes: buffer.length,
        originalFileName: file.name || null,
      });
      throw error;
    }
  }

  /**
   * Delete Media when unreferenced.
   * Order: reference check + DB delete first, then storage object.
   * Partial failure: if the DB row is removed but the file delete fails,
   * an orphan file may remain — logged for operators; the API still succeeds
   * so the catalog stays consistent (no dangling Media / ProductImage refs).
   */
  async remove(id: string): Promise<void> {
    requirePrismaDataSource();
    const mediaId = requireString(id, "id");
    const existing = await this.media.findById(mediaId);
    if (!existing) {
      throw new AppError("NOT_FOUND", `Media not found: ${mediaId}`);
    }

    const storageKey =
      existing.storageProvider && existing.fileName
        ? existing.fileName
        : null;

    // Repository enforces product-link conflict before delete.
    await this.media.remove(mediaId);

    if (storageKey && existing.storageProvider === this.storage.providerName) {
      try {
        await this.storage.delete(storageKey);
      } catch (error) {
        logger.error("Media file delete failed after DB delete (orphan file)", {
          mediaId,
          storageKey,
          storageProvider: existing.storageProvider,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Media deleted", {
      mediaId,
      hadStoredFile: Boolean(storageKey),
    });
  }
}
