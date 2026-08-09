import path from "node:path";
import { env, isProductionBuildPhase } from "@/src/server/config/env";
import type { StorageProvider } from "@/src/server/storage/interfaces";
import { ExternalStorageProvider } from "@/src/server/storage/providers/external-storage";
import { LocalStorageProvider } from "@/src/server/storage/providers/local-storage";
import { AppError } from "@/src/server/utils/errors";

function resolveLocalUploadDir(): string {
  const configured = env.mediaLocalUploadDir;
  if (configured.includes("\0") || configured.includes("..")) {
    throw new AppError(
      "CONFIG_ERROR",
      "MEDIA_LOCAL_UPLOAD_DIR contains invalid path characters.",
    );
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

/**
 * Build the configured storage provider.
 * Local storage is development/staging/test only.
 * Production uses STORAGE_PROVIDER=external until a cloud adapter is registered.
 */
export function createStorageProvider(): StorageProvider {
  if (env.storageProvider === "local") {
    if (env.isStrictProduction && !isProductionBuildPhase()) {
      throw new AppError(
        "CONFIG_ERROR",
        "STORAGE_PROVIDER=local is development-only and cannot be used in production. Configure STORAGE_PROVIDER=external and register a cloud adapter.",
        { details: { storageProvider: "local", appEnv: env.appEnv } },
      );
    }
    return new LocalStorageProvider(resolveLocalUploadDir(), "/uploads");
  }

  if (env.storageProvider === "external") {
    return new ExternalStorageProvider();
  }

  throw new AppError(
    "CONFIG_ERROR",
    `Unsupported STORAGE_PROVIDER="${String(env.storageProvider)}".`,
    { details: { storageProvider: env.storageProvider } },
  );
}
