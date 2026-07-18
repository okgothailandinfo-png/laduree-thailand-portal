import { randomUUID } from "node:crypto";
import { AppError } from "@/src/server/utils/errors";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SIGNATURES: Record<
  AllowedImageMimeType,
  (bytes: Buffer) => boolean
> = {
  "image/jpeg": (bytes) =>
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a,
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP",
};

export function isAllowedImageMimeType(
  value: string,
): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function resolveMaxFileSizeBytes(maxMbRaw?: string): number {
  const raw = (maxMbRaw ?? process.env.MEDIA_MAX_FILE_SIZE_MB ?? "10").trim();
  const mb = Number(raw);
  if (!Number.isFinite(mb) || mb <= 0 || mb > 100) {
    throw new AppError(
      "CONFIG_ERROR",
      "MEDIA_MAX_FILE_SIZE_MB must be a positive number up to 100.",
    );
  }
  return Math.floor(mb * 1024 * 1024);
}

/**
 * Strip path segments and unsafe characters. Extension is derived from MIME, not the client name.
 */
export function sanitizeOriginalFileName(original: string): string {
  const base = original.replace(/\\/g, "/").split("/").pop() ?? "upload";
  const withoutNulls = base.replace(/\0/g, "");
  const cleaned = withoutNulls
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
  return cleaned || "upload";
}

export function extensionForMime(mimeType: AllowedImageMimeType): string {
  return MIME_TO_EXTENSION[mimeType];
}

/** Unique server-side filename; never trusts the client extension. */
export function generateStorageFileName(
  mimeType: AllowedImageMimeType,
): string {
  return `${randomUUID()}.${extensionForMime(mimeType)}`;
}

/**
 * Folder segment for storage keys. Empty/undefined → no folder.
 * Rejects path traversal and absolute paths.
 */
export function sanitizeFolder(folder: string | undefined | null): string | null {
  if (folder == null) return null;
  const trimmed = folder.trim();
  if (!trimmed) return null;
  if (
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    trimmed.startsWith("/") ||
    trimmed.includes("\0")
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "folder contains invalid path characters.",
      { details: { field: "folder" } },
    );
  }
  const cleaned = trimmed
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 80);
  if (!cleaned || cleaned.includes("..")) {
    throw new AppError("VALIDATION_ERROR", "folder is invalid.", {
      details: { field: "folder" },
    });
  }
  return cleaned;
}

export function buildStorageKey(
  fileName: string,
  folder?: string | null,
): string {
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    throw new AppError("INTERNAL_ERROR", "Invalid generated storage key.");
  }
  return folder ? `${folder}/${fileName}` : fileName;
}

export type ValidatedUploadFile = {
  buffer: Buffer;
  mimeType: AllowedImageMimeType;
  originalFileName: string;
  sizeBytes: number;
};

export function validateImageUpload(params: {
  buffer: Buffer;
  declaredMimeType: string;
  originalFileName: string;
  maxBytes: number;
}): ValidatedUploadFile {
  const { buffer, declaredMimeType, originalFileName, maxBytes } = params;

  if (!buffer.length) {
    throw new AppError("VALIDATION_ERROR", "Empty files are not allowed.", {
      details: { field: "file" },
    });
  }

  if (buffer.length > maxBytes) {
    throw new AppError(
      "VALIDATION_ERROR",
      `File exceeds maximum size of ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
      {
        details: {
          field: "file",
          sizeBytes: buffer.length,
          maxBytes,
        },
      },
    );
  }

  const mime = declaredMimeType.trim().toLowerCase();
  if (!isAllowedImageMimeType(mime)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Only JPEG, PNG, and WebP images are allowed.",
      {
        details: {
          field: "file",
          mimeType: declaredMimeType,
          allowed: [...ALLOWED_IMAGE_MIME_TYPES],
        },
      },
    );
  }

  if (!SIGNATURES[mime](buffer)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "File content does not match the declared image type.",
      {
        details: { field: "file", mimeType: mime },
      },
    );
  }

  return {
    buffer,
    mimeType: mime,
    originalFileName: sanitizeOriginalFileName(originalFileName),
    sizeBytes: buffer.length,
  };
}
