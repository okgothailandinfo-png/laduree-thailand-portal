export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CONFIG_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR";

function defaultStatus(code: ErrorCode): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "CONFIG_ERROR":
    case "PROVIDER_UNAVAILABLE":
    case "DATABASE_UNAVAILABLE":
      return 503;
    case "VALIDATION_ERROR":
    case "BAD_REQUEST":
      return 400;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: unknown;
      cause?: unknown;
      retryAfterSeconds?: number;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? defaultStatus(code);
    this.details = options?.details;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
