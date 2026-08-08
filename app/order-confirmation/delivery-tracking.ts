/**
 * Mock delivery tracking UI — no courier integration.
 * Labels use Singapore-verified Order Tracker status samples only.
 *
 * Default current state after payment success: Preparing (Sprint 22 contract).
 */

import {
  DELIVERY_FULFILLMENT_STATUSES,
  getFulfillmentTrackingSteps,
  mapOrderStatusToFulfillmentLabel,
  type DeliveryFulfillmentStatus,
  type OrderStatusLike,
} from "@/lib/orders/fulfillment-status";

export const DELIVERY_TRACKING_STATUSES = DELIVERY_FULFILLMENT_STATUSES;

export type DeliveryTrackingStatus = DeliveryFulfillmentStatus;

/** Approved Sprint 22 default mock current state (SG label). */
export const DEFAULT_MOCK_DELIVERY_TRACKING_STATUS: DeliveryTrackingStatus =
  "Preparing";

export type DeliveryTrackingStep = {
  label: DeliveryTrackingStatus;
  index: number;
  isCurrent: boolean;
  isComplete: boolean;
};

export function getDeliveryTrackingSteps(
  currentStatus: DeliveryTrackingStatus = DEFAULT_MOCK_DELIVERY_TRACKING_STATUS,
): DeliveryTrackingStep[] {
  return getFulfillmentTrackingSteps("DELIVERY", currentStatus).map(
    (step) => ({
      label: step.label as DeliveryTrackingStatus,
      index: step.index,
      isCurrent: step.isCurrent,
      isComplete: step.isComplete,
    }),
  );
}

/** Map durable order status → mock delivery tracking current step. */
export function deliveryTrackingStatusFromOrderStatus(
  status: OrderStatusLike,
): DeliveryTrackingStatus {
  return mapOrderStatusToFulfillmentLabel(
    status,
    "DELIVERY",
  ) as DeliveryTrackingStatus;
}
