/**
 * External object-storage adapter boundary — vendor-neutral.
 * Pickup storefront can run with URL-referenced media; binary CMS upload in
 * production requires a registered cloud adapter (S3-compatible or equivalent).
 */

import type {
  StorageProvider,
  UploadObjectInput,
  UploadObjectResult,
} from "@/src/server/storage/interfaces";
import { AppError } from "@/src/server/utils/errors";

function unavailable(operation: string): never {
  throw new AppError(
    "PROVIDER_UNAVAILABLE",
    `External storage provider is configured but no cloud adapter is registered (${operation}).`,
    { status: 503, details: { provider: "external", operation } },
  );
}

export class ExternalStorageProvider implements StorageProvider {
  readonly name = "external";

  async upload(_input: UploadObjectInput): Promise<UploadObjectResult> {
    void _input;
    return unavailable("upload");
  }

  async delete(_key: string): Promise<void> {
    void _key;
    return unavailable("delete");
  }

  getPublicUrl(_key: string): string {
    void _key;
    return unavailable("getPublicUrl");
  }

  async exists(_key: string): Promise<boolean> {
    void _key;
    return unavailable("exists");
  }
}
