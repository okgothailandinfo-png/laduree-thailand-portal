import type { CartModifier } from "@/lib/api/types";
import { sumExactSelectionQuantity } from "@/lib/product/exact-selection";

export const CHECKOUT_BLOCKING_MESSAGES = {
  emptyCart: "Your cart is empty.Add at least 1 item to checkout!",
  missingBoutique: "Please select a pickup boutique.",
  missingPickupDateTime: "Please select a pickup date and time.",
  incompleteSelection: "Complete your macaron selection.",
  unavailableProducts: "One or more products are unavailable.",
  priceUnavailable: "Price unavailable for one or more products.",
  stalePickupSlot: "The selected pickup time is no longer available.",
  cartLoading: "Loading cart…",
} as const;

export type ConfirmedPickupIds = {
  boutiqueId: string;
  dateKey: string;
  timeSlotId: string;
};

export type CheckoutEligibilityItem = {
  quantity: number;
  modifiers: CartModifier[];
  /** When set, modifier quantities for this line must total exactly this value. */
  exactSelectionQuantity?: number | null;
  available?: boolean;
  priceAvailable?: boolean;
};

export type CheckoutEligibilityConfirmed = {
  boutiqueId?: string | null;
  dateKey?: string | null;
  timeSlotId?: string | null;
};

export type CheckoutEligibilityInput = {
  items: CheckoutEligibilityItem[];
  confirmed: CheckoutEligibilityConfirmed | null;
  cartStatus?: "loading" | "success" | "error" | "empty";
  /** When false, treat the confirmed slot as stale/unavailable. */
  pickupSlotAvailable?: boolean;
};

export type CheckoutEligibility = {
  /** CTA must remain visible whenever the cart has items. */
  ctaVisible: boolean;
  canCheckout: boolean;
  reason: string | null;
  label: "Checkout" | "Proceed to Checkout";
  blockingReasons: string[];
  diagnostics: CheckoutEligibilityDiagnostics;
};

export type CheckoutEligibilityDiagnostics = {
  hasItems: boolean;
  hasValidPrices: boolean;
  hasBoutiqueId: boolean;
  hasPickupDate: boolean;
  hasTimeSlotId: boolean;
  pickupSlotAvailable: boolean;
  exactSelectionComplete: boolean;
  checkoutEligible: boolean;
  blockingReasons: string[];
};

export function hasValidConfirmedPickupIds(
  confirmed: CheckoutEligibilityConfirmed | null | undefined,
): confirmed is ConfirmedPickupIds {
  if (!confirmed) return false;
  return (
    typeof confirmed.boutiqueId === "string" &&
    confirmed.boutiqueId.trim().length > 0 &&
    typeof confirmed.dateKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(confirmed.dateKey) &&
    typeof confirmed.timeSlotId === "string" &&
    confirmed.timeSlotId.trim().length > 0
  );
}

function hasIncompleteExactSelection(items: CheckoutEligibilityItem[]): boolean {
  for (const item of items) {
    const required = item.exactSelectionQuantity;
    if (typeof required !== "number" || required <= 0) continue;
    if (item.quantity !== 1) return true;
    const total = sumExactSelectionQuantity(
      {
        id: "exact",
        type: "quantity",
        options: item.modifiers.map((modifier) => modifier.label),
        exactSelectionQuantity: required,
      },
      item.modifiers,
    );
    if (total !== required) return true;
  }
  return false;
}

function buildResult(input: {
  ctaVisible: boolean;
  canCheckout: boolean;
  reason: string | null;
  label: "Checkout" | "Proceed to Checkout";
  diagnostics: CheckoutEligibilityDiagnostics;
}): CheckoutEligibility {
  return {
    ...input,
    blockingReasons: input.diagnostics.blockingReasons,
  };
}

/**
 * Cart checkout CTA eligibility — client gate only.
 * Server checkout validation remains authoritative.
 */
export function getCheckoutEligibility(
  input: CheckoutEligibilityInput,
): CheckoutEligibility {
  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = itemCount > 0;
  const hasValidPrices =
    hasItems && input.items.every((item) => item.priceAvailable === true);
  const hasBoutiqueId =
    typeof input.confirmed?.boutiqueId === "string" &&
    input.confirmed.boutiqueId.trim().length > 0;
  const hasPickupDate =
    typeof input.confirmed?.dateKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.confirmed.dateKey);
  const hasTimeSlotId =
    typeof input.confirmed?.timeSlotId === "string" &&
    input.confirmed.timeSlotId.trim().length > 0;
  const exactSelectionComplete = !hasIncompleteExactSelection(input.items);
  const pickupSlotAvailable = input.pickupSlotAvailable !== false;
  const blockingReasons: string[] = [];

  if (!hasItems) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.emptyCart);
  }
  if (input.cartStatus === "loading") {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.cartLoading);
  }
  if (hasItems && input.items.some((item) => item.available === false)) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.unavailableProducts);
  }
  if (hasItems && input.items.some((item) => item.priceAvailable !== true)) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.priceUnavailable);
  }
  if (hasItems && !exactSelectionComplete) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.incompleteSelection);
  }
  if (hasItems && !hasBoutiqueId) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.missingBoutique);
  } else if (hasItems && (!hasPickupDate || !hasTimeSlotId)) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.missingPickupDateTime);
  }
  if (
    hasItems &&
    hasBoutiqueId &&
    hasPickupDate &&
    hasTimeSlotId &&
    !pickupSlotAvailable
  ) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.stalePickupSlot);
  }

  const checkoutEligible = hasItems && blockingReasons.length === 0;
  const diagnostics: CheckoutEligibilityDiagnostics = {
    hasItems,
    hasValidPrices,
    hasBoutiqueId,
    hasPickupDate,
    hasTimeSlotId,
    pickupSlotAvailable,
    exactSelectionComplete,
    checkoutEligible,
    blockingReasons: [...blockingReasons],
  };

  if (!hasItems) {
    return buildResult({
      ctaVisible: false,
      canCheckout: false,
      reason: CHECKOUT_BLOCKING_MESSAGES.emptyCart,
      label: "Checkout",
      diagnostics,
    });
  }

  if (blockingReasons.length > 0) {
    return buildResult({
      ctaVisible: true,
      canCheckout: false,
      reason: blockingReasons[0] ?? CHECKOUT_BLOCKING_MESSAGES.missingPickupDateTime,
      label: "Checkout",
      diagnostics,
    });
  }

  return buildResult({
    ctaVisible: true,
    canCheckout: true,
    reason: null,
    label: "Proceed to Checkout",
    diagnostics,
  });
}

/** Development-only console diagnostics — never rendered in production UI. */
export function logCheckoutEligibilityDiagnostics(
  diagnostics: CheckoutEligibilityDiagnostics,
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[checkout-eligibility]", diagnostics);
}
