import { AppError } from "@/src/server/utils/errors";

/** Convert major THB units to integer satang (minor units). */
export function thbMajorToMinor(major: number): number {
  if (!Number.isFinite(major) || major < 0) {
    throw new AppError("VALIDATION_ERROR", "Price must be zero or greater.", {
      details: { field: "priceThb" },
    });
  }
  return Math.round(major * 100);
}

/** Convert satang (minor units) to major THB units. */
export function minorToMajor(minor: number): number {
  return minor / 100;
}
