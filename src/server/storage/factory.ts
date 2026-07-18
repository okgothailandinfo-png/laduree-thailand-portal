import path from "node:path";
import type { StorageProvider } from "@/src/server/storage/interfaces";
import { LocalStorageProvider } from "@/src/server/storage/providers/local-storage";
import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

function isProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function resolveLocalUploadDir(): string {
  const configured =
    process.env.MEDIA_LOCAL_UPLOAD_DIR?.trim() || "public/uploads";
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
 * Local storage is development/test only — production runtime must use a cloud provider later.
 * During `next build` (NODE_ENV=production), local is allowed for compile-time module init only.
 */
export function createStorageProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();

  if (raw === "local") {
    if (env.nodeEnv === "production" && !isProductionBuildPhase()) {
      throw new AppError(
        "CONFIG_ERROR",
        "STORAGE_PROVIDER=local is development-only and cannot be used in production. Configure a cloud storage provider before deploying.",
        { details: { storageProvider: "local", nodeEnv: env.nodeEnv } },
      );
    }
    return new LocalStorageProvider(resolveLocalUploadDir(), "/uploads");
  }

  throw new AppError(
    "CONFIG_ERROR",
    `Unsupported STORAGE_PROVIDER="${raw}". Only "local" is available in this sprint.`,
    { details: { storageProvider: raw } },
  );
}
