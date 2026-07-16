import { AppError } from "@/src/server/utils/errors";

export function requireObject(value: unknown, label = "body"): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("VALIDATION_ERROR", `${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function requireString(
  value: unknown,
  field: string,
  options?: { min?: number; max?: number },
): string {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${field} is required.`, {
      details: { field },
    });
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError("VALIDATION_ERROR", `${field} is required.`, {
      details: { field },
    });
  }
  if (options?.min !== undefined && trimmed.length < options.min) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be at least ${options.min} characters.`,
      { details: { field } },
    );
  }
  if (options?.max !== undefined && trimmed.length > options.max) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be at most ${options.max} characters.`,
      { details: { field } },
    );
  }
  return trimmed;
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${field} must be a string.`, {
      details: { field },
    });
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new AppError("VALIDATION_ERROR", `${field} must be a boolean.`, {
      details: { field },
    });
  }
  return value;
}

export function requirePositiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a positive integer.`,
      { details: { field } },
    );
  }
  return value;
}

export function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a non-empty array.`,
      { details: { field } },
    );
  }
  return value;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[\s\-()]/g, "");
  return /^\+?\d{8,15}$/.test(digits);
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
