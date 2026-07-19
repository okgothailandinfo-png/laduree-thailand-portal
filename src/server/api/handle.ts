import { assertRuntimeEnv, EnvValidationError } from "@/src/server/config/env";
import { toErrorResponse } from "@/src/server/api/responses";
import {
  createRequestId,
  REQUEST_ID_HEADER,
  runWithRequestContext,
} from "@/src/server/http/request-context";
import { AppError } from "@/src/server/utils/errors";
import { logEvent } from "@/src/server/utils/logger";

function pathFromRequest(request?: Request): string {
  if (!request) return "unknown";
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

/**
 * Thin wrapper so route handlers share consistent error → response mapping,
 * request correlation, and fail-closed env checks.
 */
export async function handleApi(
  run: () => Promise<Response> | Response,
  request?: Request,
): Promise<Response> {
  const requestId = createRequestId(request?.headers.get(REQUEST_ID_HEADER));
  const started = Date.now();
  const method = request?.method ?? "UNKNOWN";
  const path = pathFromRequest(request);

  return runWithRequestContext(requestId, async () => {
    try {
      try {
        assertRuntimeEnv();
      } catch (error) {
        if (error instanceof EnvValidationError) {
          throw new AppError("CONFIG_ERROR", error.message);
        }
        throw error;
      }

      const response = await run();
      const status = response.status;
      const durationMs = Date.now() - started;
      if (status >= 400) {
        logEvent.apiFailed({ method, path, status, durationMs });
      } else {
        logEvent.apiCompleted({ method, path, status, durationMs });
      }

      const headers = new Headers(response.headers);
      headers.set(REQUEST_ID_HEADER, requestId);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const failed = toErrorResponse(error);
      logEvent.apiFailed({
        method,
        path,
        status: failed.status,
        code: isErrorCode(error),
        durationMs: Date.now() - started,
      });
      return failed;
    }
  });
}

function isErrorCode(error: unknown): string | undefined {
  if (error instanceof AppError) return error.code;
  return undefined;
}
