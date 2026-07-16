"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError } from "@/lib/api/client";

export type AsyncStatus = "loading" | "success" | "error" | "empty";

export type AsyncResourceState<T> = {
  status: AsyncStatus;
  data: T | null;
  errorMessage: string | null;
  reload: () => void;
};

export function useAsyncResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  options?: {
    isEmpty?: (data: T) => boolean;
    deps?: unknown[];
  },
): AsyncResourceState<T> {
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [data, setData] = useState<T | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const empty = options?.isEmpty?.(result) ?? false;
        setData(result);
        setStatus(empty ? "empty" : "success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Something went wrong.";
        setData(null);
        setErrorMessage(message);
        setStatus("error");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
  }, [reloadToken, ...(options?.deps ?? [])]);

  return { status, data, errorMessage, reload };
}
