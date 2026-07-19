import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/src/server/types/api";
import { env } from "@/src/server/config/env";
import { getRequestId } from "@/src/server/http/request-context";
import { AppError, isAppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";

function withRequestId<T extends Record<string, unknown>>(
  body: T,
): T & { requestId?: string } {
  const requestId = getRequestId();
  return requestId ? { ...body, requestId } : body;
}

function responseHeaders(init?: ResponseInit): Headers {
  const headers = new Headers(init?.headers);
  const requestId = getRequestId();
  if (requestId) {
    headers.set("x-request-id", requestId);
  }
  return headers;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  const body: ApiSuccessResponse<T> = withRequestId({ success: true, data });
  return NextResponse.json(body, {
    status: 200,
    ...init,
    headers: responseHeaders(init),
  });
}

export function created<T>(data: T, init?: ResponseInit): NextResponse {
  const body: ApiSuccessResponse<T> = withRequestId({ success: true, data });
  return NextResponse.json(body, {
    status: 201,
    ...init,
    headers: responseHeaders(init),
  });
}

export function fail(
  error:
    | AppError
    | { code: string; message: string; status?: number; details?: unknown; retryAfterSeconds?: number },
): NextResponse {
  const status = error instanceof AppError ? error.status : (error.status ?? 400);
  const includeDetails =
    env.appEnv === "development" || env.appEnv === "test";
  const details =
    "details" in error && error.details !== undefined && includeDetails
      ? error.details
      : undefined;

  const body: ApiErrorResponse = withRequestId({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(details !== undefined ? { details } : {}),
    },
  });

  const headers = responseHeaders();
  const retryAfter =
    error instanceof AppError
      ? error.retryAfterSeconds
      : error.retryAfterSeconds;
  if (retryAfter !== undefined) {
    headers.set("Retry-After", String(retryAfter));
  }

  return NextResponse.json(body, { status, headers });
}

function sanitizeUnknownError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("can't reach database") ||
    (lower.includes("prisma") && lower.includes("p1001")) ||
    (lower.includes("database") && lower.includes("unavailable")) ||
    lower.includes("econnrefused")
  ) {
    logger.error("Database unavailable", {
      message: env.appEnv === "development" ? message : undefined,
    });
    return new AppError(
      "DATABASE_UNAVAILABLE",
      "Database is temporarily unavailable.",
    );
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (code.startsWith("P")) {
      return new AppError(
        "DATABASE_UNAVAILABLE",
        "Database is temporarily unavailable.",
      );
    }
  }

  return new AppError("INTERNAL_ERROR", "An unexpected error occurred.", {
    status: 500,
  });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    if (error.status >= 500) {
      logger.error(error.message, {
        code: error.code,
        ...(env.appEnv === "development" || env.appEnv === "test"
          ? { details: error.details }
          : {}),
      });
    } else {
      logger.warn(error.message, { code: error.code });
    }
    return fail(error);
  }

  logger.error("Unhandled API error", {
    message:
      env.appEnv === "development" || env.appEnv === "test"
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined,
  });

  return fail(sanitizeUnknownError(error));
}
