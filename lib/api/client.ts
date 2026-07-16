import type { ApiResponse } from "@/lib/api/types";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      "BAD_RESPONSE",
      "The server returned an invalid response.",
      response.status,
    );
  }

  if (!isRecord(payload) || typeof payload.success !== "boolean") {
    throw new ApiClientError(
      "BAD_RESPONSE",
      "Unexpected API response shape.",
      response.status,
    );
  }

  const envelope = payload as ApiResponse<T>;

  if (envelope.success) {
    return envelope.data;
  }

  throw new ApiClientError(
    envelope.error?.code ?? "UNKNOWN",
    envelope.error?.message ?? "Request failed.",
    response.status,
  );
}

/**
 * Typed GET against the existing `{ success, data }` / `{ success:false, error }` envelope.
 * Browser-relative paths (`/api/...`) only — no server/Prisma imports.
 */
export async function apiGet<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  return parseEnvelope<T>(response);
}

/**
 * Typed JSON mutation (POST / PATCH / DELETE) using native fetch.
 */
export async function apiMutate<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseEnvelope<T>(response);
}
