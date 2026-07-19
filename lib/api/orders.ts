import { apiGet } from "@/lib/api/client";
import type { OrderDetail, OrderPickupCredentials } from "@/lib/api/types";

export function fetchOrderById(id: string, init?: RequestInit) {
  return apiGet<OrderDetail>(`/api/orders/${encodeURIComponent(id)}`, init);
}

export function fetchOrderPickupCredentials(id: string, init?: RequestInit) {
  return apiGet<OrderPickupCredentials>(
    `/api/orders/${encodeURIComponent(id)}/pickup`,
    init,
  );
}
