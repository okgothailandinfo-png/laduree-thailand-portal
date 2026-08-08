import { apiGet } from "@/lib/api/client";
import type {
  OrderCompletion,
  OrderDetail,
  OrderHistoryItem,
  OrderPickupCredentials,
} from "@/lib/api/types";

function withAccessToken(
  path: string,
  accessToken: string | null | undefined,
): string {
  const token = accessToken?.trim();
  if (!token) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}token=${encodeURIComponent(token)}`;
}

export function fetchOrderById(
  id: string,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiGet<OrderDetail>(
    withAccessToken(`/api/orders/${encodeURIComponent(id)}`, accessToken),
    rest,
  );
}

export function fetchOrderPickupCredentials(
  id: string,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiGet<OrderPickupCredentials>(
    withAccessToken(
      `/api/orders/${encodeURIComponent(id)}/pickup`,
      accessToken,
    ),
    rest,
  );
}

export function fetchOrderCompletion(
  id: string,
  init?: RequestInit & { accessToken?: string | null },
) {
  const { accessToken, ...rest } = init ?? {};
  return apiGet<OrderCompletion>(
    withAccessToken(
      `/api/orders/${encodeURIComponent(id)}/completion`,
      accessToken,
    ),
    rest,
  );
}

export function fetchOrderHistory(
  entries: Array<{ orderId: string; accessToken: string }>,
  init?: RequestInit,
) {
  if (entries.length === 0) {
    return Promise.resolve([] as OrderHistoryItem[]);
  }
  const params = new URLSearchParams({
    ids: entries.map((entry) => entry.orderId).join(","),
    tokens: entries.map((entry) => entry.accessToken).join(","),
  });
  return apiGet<OrderHistoryItem[]>(`/api/orders/history?${params}`, init);
}
