import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

type RequestStore = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestStore>();

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export function createRequestId(incoming: string | null | undefined): string {
  const trimmed = incoming?.trim();
  if (trimmed && SAFE_REQUEST_ID.test(trimmed)) {
    return trimmed;
  }
  return randomUUID();
}

export function runWithRequestContext<T>(
  requestId: string,
  fn: () => T,
): T {
  return storage.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
