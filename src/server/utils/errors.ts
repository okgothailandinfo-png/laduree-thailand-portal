export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "CONFIG_ERROR"
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
    case "CONFIG_ERROR":
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

  constructor(
    code: ErrorCode,
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? defaultStatus(code);
    this.details = options?.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
