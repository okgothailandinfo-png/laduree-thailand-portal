import { mkdir, unlink, writeFile, access } from "node:fs/promises";
import path from "node:path";
import type {
  StorageProvider,
  UploadObjectInput,
  UploadObjectResult,
} from "@/src/server/storage/interfaces";
import { AppError } from "@/src/server/utils/errors";

/**
 * Development-only filesystem storage under a configured public directory.
 * Never expose absolute filesystem paths in API responses.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  constructor(
    private readonly rootDir: string,
    private readonly publicBasePath: string = "/uploads",
  ) {}

  private resolveSafePath(key: string): string {
    if (
      !key ||
      key.includes("\0") ||
      key.includes("..") ||
      path.isAbsolute(key) ||
      key.startsWith("/") ||
      key.startsWith("\\")
    ) {
      throw new AppError("VALIDATION_ERROR", "Invalid storage key.");
    }
    const normalizedRoot = path.resolve(this.rootDir);
    const resolved = path.resolve(normalizedRoot, key);
    const relative = path.relative(normalizedRoot, resolved);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.includes("..")
    ) {
      throw new AppError("VALIDATION_ERROR", "Invalid storage key path.");
    }
    return resolved;
  }

  getPublicUrl(key: string): string {
    // Validate key shape without exposing FS path.
    this.resolveSafePath(key);
    const segments = key.split("/").map(encodeURIComponent).join("/");
    return `${this.publicBasePath}/${segments}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolveSafePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async upload(input: UploadObjectInput): Promise<UploadObjectResult> {
    const absolute = this.resolveSafePath(input.key);
    await mkdir(path.dirname(absolute), { recursive: true });

    try {
      // wx: fail if the file already exists (no overwrite).
      await writeFile(absolute, input.data, { flag: "wx" });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        throw new AppError(
          "CONFLICT",
          "A file with this storage key already exists.",
          { details: { key: input.key } },
        );
      }
      throw error;
    }

    return {
      key: input.key,
      publicUrl: this.getPublicUrl(input.key),
      sizeBytes: input.data.length,
    };
  }

  async delete(key: string): Promise<void> {
    const absolute = this.resolveSafePath(key);
    try {
      await unlink(absolute);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return;
      }
      throw error;
    }
  }
}
