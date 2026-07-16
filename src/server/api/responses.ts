import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/src/server/types/api";
import { AppError, isAppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  const body: ApiSuccessResponse<T> = { success: true, data };
  return NextResponse.json(body, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit): NextResponse {
  const body: ApiSuccessResponse<T> = { success: true, data };
  return NextResponse.json(body, { status: 201, ...init });
}

export function fail(
  error: AppError | { code: string; message: string; status?: number; details?: unknown },
): NextResponse {
  const status = error instanceof AppError ? error.status : (error.status ?? 400);
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...("details" in error && error.details !== undefined
        ? { details: error.details }
        : {}),
    },
  };
  return NextResponse.json(body, { status });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    if (error.status >= 500) {
      logger.error(error.message, { code: error.code, details: error.details });
    } else {
      logger.warn(error.message, { code: error.code, details: error.details });
    }
    return fail(error);
  }

  logger.error("Unhandled API error", {
    message: error instanceof Error ? error.message : String(error),
  });

  return fail(
    new AppError("INTERNAL_ERROR", "An unexpected error occurred.", {
      status: 500,
    }),
  );
}
