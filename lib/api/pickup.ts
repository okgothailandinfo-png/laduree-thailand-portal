import { apiGet } from "@/lib/api/client";
import type { PickupAvailability } from "@/lib/api/types";

/**
 * GET /api/pickup/availability — existing contract:
 * query: boutiqueId + dateKey (YYYY-MM-DD)
 */
export function fetchPickupAvailability(
  params: { boutiqueId: string; dateKey: string },
  init?: RequestInit,
) {
  const query = new URLSearchParams({
    boutiqueId: params.boutiqueId,
    dateKey: params.dateKey,
  });
  return apiGet<PickupAvailability>(
    `/api/pickup/availability?${query.toString()}`,
    init,
  );
}
