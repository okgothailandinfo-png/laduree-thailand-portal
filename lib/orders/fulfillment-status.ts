/**
 * Customer-facing fulfillment labels — Singapore-verified tracker status samples.
 * Safe for client + server (no Node/server secrets).
 *
 * Verified samples (docs/user-flow.md, docs/components.md):
 * Submitted → Accepted → Preparing → Ready / Ready For Collection →
 * Collected / Delivering → Delivered → Completed
 */

export type OrderStatusLike =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "mock_placed";

export type ServiceTypeLike = "PICKUP" | "DELIVERY";

export const PICKUP_FULFILLMENT_STATUSES = [
  "Submitted",
  "Accepted",
  "Preparing",
  "Ready For Collection",
  "Collected",
  "Completed",
] as const;

export const DELIVERY_FULFILLMENT_STATUSES = [
  "Submitted",
  "Accepted",
  "Preparing",
  "Ready",
  "Delivering",
  "Delivered",
  "Completed",
] as const;

export type PickupFulfillmentStatus =
  (typeof PICKUP_FULFILLMENT_STATUSES)[number];
export type DeliveryFulfillmentStatus =
  (typeof DELIVERY_FULFILLMENT_STATUSES)[number];
export type CustomerFulfillmentStatus =
  | PickupFulfillmentStatus
  | DeliveryFulfillmentStatus;

export function mapOrderStatusToFulfillmentLabel(
  status: OrderStatusLike,
  serviceType: ServiceTypeLike,
): CustomerFulfillmentStatus {
  if (serviceType === "DELIVERY") {
    switch (status) {
      case "pending":
        return "Submitted";
      case "confirmed":
      case "mock_placed":
        return "Accepted";
      case "preparing":
        return "Preparing";
      case "ready_for_pickup":
        return "Ready";
      case "completed":
        return "Delivered";
      case "cancelled":
        return "Submitted";
      default:
        return "Preparing";
    }
  }

  switch (status) {
    case "pending":
      return "Submitted";
    case "confirmed":
    case "mock_placed":
      return "Accepted";
    case "preparing":
      return "Preparing";
    case "ready_for_pickup":
      return "Ready For Collection";
    case "completed":
      return "Collected";
    case "cancelled":
      return "Submitted";
    default:
      return "Preparing";
  }
}

export function getFulfillmentTrackingSteps(
  serviceType: ServiceTypeLike,
  currentLabel: CustomerFulfillmentStatus,
): Array<{
  label: string;
  index: number;
  isCurrent: boolean;
  isComplete: boolean;
}> {
  if (serviceType === "DELIVERY") {
    const statuses = DELIVERY_FULFILLMENT_STATUSES;
    const currentIndex = statuses.indexOf(
      currentLabel as DeliveryFulfillmentStatus,
    );
    const activeIndex = currentIndex >= 0 ? currentIndex : 1;
    return statuses.map((label, index) => ({
      label,
      index,
      isCurrent: index === activeIndex,
      isComplete: index < activeIndex,
    }));
  }

  const statuses = PICKUP_FULFILLMENT_STATUSES;
  const currentIndex = statuses.indexOf(
    currentLabel as PickupFulfillmentStatus,
  );
  const activeIndex = currentIndex >= 0 ? currentIndex : 1;
  return statuses.map((label, index) => ({
    label,
    index,
    isCurrent: index === activeIndex,
    isComplete: index < activeIndex,
  }));
}
