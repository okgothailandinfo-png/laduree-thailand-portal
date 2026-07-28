/**
 * Runtime delivery engine wiring.
 * Production defaults stay empty; demo fixture loads only when gated on.
 */

import {
  createDeliveryAvailabilityEngine,
  type DeliveryAvailabilityEngine,
} from "@/src/server/delivery/availability";
import {
  createDeliveryFeeEngine,
  type DeliveryFeeEngine,
} from "@/src/server/delivery/fee-engine";
import {
  buildDemoPreorderConfig,
  DEMO_DELIVERY_ZONES,
  DEMO_EARLIEST_AVAILABILITY_RULES,
  isDeliveryDemoFixtureEnabled,
} from "@/src/server/delivery/demo-fixture";

export function createRuntimeDeliveryFeeEngine(): DeliveryFeeEngine {
  if (isDeliveryDemoFixtureEnabled()) {
    return createDeliveryFeeEngine(DEMO_DELIVERY_ZONES);
  }
  return createDeliveryFeeEngine();
}

export function createRuntimeDeliveryAvailabilityEngine(
  now: Date = new Date(),
): DeliveryAvailabilityEngine {
  if (isDeliveryDemoFixtureEnabled()) {
    return createDeliveryAvailabilityEngine(
      DEMO_EARLIEST_AVAILABILITY_RULES,
      buildDemoPreorderConfig(now),
    );
  }
  return createDeliveryAvailabilityEngine();
}
