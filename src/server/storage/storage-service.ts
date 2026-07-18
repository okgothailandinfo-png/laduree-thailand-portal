import type {
  StorageProvider,
  UploadObjectResult,
} from "@/src/server/storage/interfaces";
import { readImageDimensions } from "@/src/server/storage/image-dimensions";
import {
  buildStorageKey,
  generateStorageFileName,
  resolveMaxFileSizeBytes,
  sanitizeFolder,
  validateImageUpload,
  type AllowedImageMimeType,
} from "@/src/server/storage/validation";

export type StorageUploadInput = {
  buffer: Buffer;
  declaredMimeType: string;
  originalFileName: string;
  folder?: string | null;
};

export type StorageUploadResult = UploadObjectResult & {
  fileName: string;
  storageKey: string;
  originalFileName: string;
  mimeType: AllowedImageMimeType;
  width: number | null;
  height: number | null;
};

/**
 * Application-facing storage facade: validation + provider operations.
 * Admin UI and route handlers must use this (or AdminMediaService), never the FS directly.
 */
export class StorageService {
  constructor(private readonly provider: StorageProvider) {}

  get providerName(): string {
    return this.provider.name;
  }

  async uploadImage(input: StorageUploadInput): Promise<StorageUploadResult> {
    const maxBytes = resolveMaxFileSizeBytes();
    const validated = validateImageUpload({
      buffer: input.buffer,
      declaredMimeType: input.declaredMimeType,
      originalFileName: input.originalFileName,
      maxBytes,
    });

    const folder = sanitizeFolder(input.folder);
    const fileName = generateStorageFileName(validated.mimeType);
    const storageKey = buildStorageKey(fileName, folder);
    const dimensions = readImageDimensions(
      validated.buffer,
      validated.mimeType,
    );

    const uploaded = await this.provider.upload({
      key: storageKey,
      data: validated.buffer,
      mimeType: validated.mimeType,
    });

    return {
      ...uploaded,
      fileName,
      storageKey,
      originalFileName: validated.originalFileName,
      mimeType: validated.mimeType,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    };
  }

  async delete(key: string): Promise<void> {
    await this.provider.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  getPublicUrl(key: string): string {
    return this.provider.getPublicUrl(key);
  }
}
