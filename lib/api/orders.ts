import { apiGet } from "@/lib/api/client";
import type { OrderDetail } from "@/lib/api/types";

export function fetchOrderById(id: string, init?: RequestInit) {
  return apiGet<OrderDetail>(`/api/orders/${encodeURIComponent(id)}`, init);
}
