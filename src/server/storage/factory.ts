import path from "node:path";
import { env, isProductionBuildPhase } from "@/src/server/config/env";
import type { StorageProvider } from "@/src/server/storage/interfaces";
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
 * Production refuses local (fail-closed). Cloud providers are a Production Blocker.
 */
export function createStorageProvider(): StorageProvider {
  if (env.storageProvider === "local") {
    if (env.isStrictProduction && !isProductionBuildPhase()) {
      throw new AppError(
        "CONFIG_ERROR",
        "STORAGE_PROVIDER=local is development-only and cannot be used in production. Configure a cloud storage provider before deploying.",
        { details: { storageProvider: "local", appEnv: env.appEnv } },
      );
    }
    return new LocalStorageProvider(resolveLocalUploadDir(), "/uploads");
  }

  throw new AppError(
    "CONFIG_ERROR",
    `Unsupported STORAGE_PROVIDER="${env.storageProvider}". Cloud storage is a Production Blocker.`,
    { details: { storageProvider: env.storageProvider } },
  );
}
