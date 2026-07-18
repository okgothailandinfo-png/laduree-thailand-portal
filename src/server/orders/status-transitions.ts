/** Order status transition rules for admin fulfilment workflow. */

import type { OrderStatus } from "@/src/server/models/order";
import { AppError } from "@/src/server/utils/errors";

/**
 * Allowed next statuses keyed by current status.
 * Terminal states (completed, cancelled) have no transitions.
 * PREPARING does not allow CANCELLED (business rule: cancel only early stages).
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup"],
  ready_for_pickup: ["completed"],
  completed: [],
  cancelled: [],
  /** Legacy mock-place path — treat like confirmed for fulfilment. */
  mock_placed: ["preparing", "cancelled"],
};

export function getAllowedNextStatuses(
  current: OrderStatus,
): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true; // idempotent no-op
  return getAllowedNextStatuses(from).includes(to);
}

export function assertValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (from === to) return;
  if (!isValidStatusTransition(from, to)) {
    throw new AppError(
      "CONFLICT",
      `Invalid order status transition: ${from} → ${to}.`,
      { details: { from, to, allowed: [...getAllowedNextStatuses(from)] } },
    );
  }
}
