import { apiGet } from "@/lib/api/client";
import type {
  OrderCompletion,
  OrderDetail,
  OrderHistoryItem,
  OrderPickupCredentials,
} from "@/lib/api/types";

export function fetchOrderById(id: string, init?: RequestInit) {
  return apiGet<OrderDetail>(`/api/orders/${encodeURIComponent(id)}`, init);
}

export function fetchOrderPickupCredentials(id: string, init?: RequestInit) {
  return apiGet<OrderPickupCredentials>(
    `/api/orders/${encodeURIComponent(id)}/pickup`,
    init,
  );
}

export function fetchOrderCompletion(id: string, init?: RequestInit) {
  return apiGet<OrderCompletion>(
    `/api/orders/${encodeURIComponent(id)}/completion`,
    init,
  );
}

export function fetchOrderHistory(ids: string[], init?: RequestInit) {
  if (ids.length === 0) {
    return Promise.resolve([] as OrderHistoryItem[]);
  }
  const params = new URLSearchParams({
    ids: ids.join(","),
  });
  return apiGet<OrderHistoryItem[]>(`/api/orders/history?${params}`, init);
}
