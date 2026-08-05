/**
 * Mock delivery tracking UI — no courier integration.
 * Default current state for Sprint 22: Preparing.
 */

export const DELIVERY_TRACKING_STATUSES = [
  "Order received",
  "Preparing",
  "Ready for dispatch",
  "Out for delivery",
  "Delivered",
] as const;

export type DeliveryTrackingStatus =
  (typeof DELIVERY_TRACKING_STATUSES)[number];

/** Approved Sprint 22 default mock current state. */
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
  const currentIndex = DELIVERY_TRACKING_STATUSES.indexOf(currentStatus);
  const activeIndex = currentIndex >= 0 ? currentIndex : 1;

  return DELIVERY_TRACKING_STATUSES.map((label, index) => ({
    label,
    index,
    isCurrent: index === activeIndex,
    isComplete: index < activeIndex,
  }));
}
