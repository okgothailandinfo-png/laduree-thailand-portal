import type { FulfillmentServiceType } from "./pickup-availability";

export type OpenPickupSelectionStep =
  | "service"
  | "address"
  | "mode"
  | "boutique"
  | "datetime";

export type OpenPickupSelectionOpts = {
  step?: OpenPickupSelectionStep;
  /** When set (e.g. Cart Pick-up / Delivery tab), initializes the service page to that type. */
  serviceType?: FulfillmentServiceType;
};

export type ResolveInitialServiceOnOpenInput = {
  confirmedServiceType: FulfillmentServiceType | null;
  requestedServiceType?: FulfillmentServiceType;
};

export type ResolveInitialServiceOnOpenResult = {
  serviceType: FulfillmentServiceType;
  /** True when the user explicitly requested a different service than the confirmed one. */
  serviceChanged: boolean;
  /** True when an existing confirmed selection should be restored into the draft. */
  preserveConfirmed: boolean;
};

/**
 * Resolves which service type the selection modal should show on open.
 * PICKUP is the default only when nothing is confirmed and nothing was requested.
 */
export function resolveInitialServiceOnOpen(
  input: ResolveInitialServiceOnOpenInput,
): ResolveInitialServiceOnOpenResult {
  const requested = input.requestedServiceType;
  const confirmed = input.confirmedServiceType;

  if (requested) {
    if (confirmed && requested === confirmed) {
      return {
        serviceType: confirmed,
        serviceChanged: false,
        preserveConfirmed: true,
      };
    }
    if (confirmed && requested !== confirmed) {
      return {
        serviceType: requested,
        serviceChanged: true,
        preserveConfirmed: false,
      };
    }
    return {
      serviceType: requested,
      serviceChanged: false,
      preserveConfirmed: false,
    };
  }

  if (confirmed) {
    return {
      serviceType: confirmed,
      serviceChanged: false,
      preserveConfirmed: true,
    };
  }

  return {
    serviceType: "PICKUP",
    serviceChanged: false,
    preserveConfirmed: false,
  };
}
