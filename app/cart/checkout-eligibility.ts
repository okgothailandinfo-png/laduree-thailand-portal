import type { CartModifier } from "@/lib/api/types";
import { sumExactSelectionQuantity } from "@/lib/product/exact-selection";
import type { DeliveryQuote } from "../pickup/delivery-quote";
import { resolveDeliveryQuoteStatus } from "../pickup/delivery-quote";
import type { DeliveryAddressDraft } from "../pickup/pickup-availability";
import {
  hasValidDeliveryPostalCode,
  isCompleteDeliveryAddress,
} from "../pickup/pickup-availability";

export const CHECKOUT_BLOCKING_MESSAGES = {
  emptyCart: "Your cart is empty.Add at least 1 item to checkout!",
  missingBoutique: "Please select a pickup boutique.",
  missingPickupDateTime: "Please select a pickup date and time.",
  incompleteSelection: "Complete your macaron selection.",
  unavailableProducts: "One or more products are unavailable.",
  priceUnavailable: "Price unavailable for one or more products.",
  stalePickupSlot: "The selected pickup time is no longer available.",
  cartLoading: "Loading cart…",
  missingDeliveryPostal: "The Postal Code field is required.",
  invalidDeliveryPostal: "Wrong postal code or address",
  unsupportedDeliveryZone:
    "The postal / address is not available for delivery yet.",
  missingDeliveryFee: "Delivery fee is unavailable for this address.",
  deliveryUnavailable: "Delivery is not available at this time.",
  missingPreorderDate: "Please select a future delivery date.",
  stalePreorderDate: "The selected delivery date is no longer available.",
  missingDeliveryWindow: "Delivery is not available at this time.",
  missingDeliveryAddress: "Wrong postal code or address",
} as const;

export type ConfirmedPickupIds = {
  boutiqueId: string;
  dateKey: string;
  timeSlotId: string;
};

export type CheckoutEligibilityItem = {
  quantity: number;
  modifiers: CartModifier[];
  exactSelectionQuantity?: number | null;
  available?: boolean;
  priceAvailable?: boolean;
};

export type CheckoutEligibilityConfirmed = {
  boutiqueId?: string | null;
  dateKey?: string | null;
  timeSlotId?: string | null;
};

export type DeliveryModeEligibility = "EARLIEST_AVAILABLE" | "PREORDER";

export type CheckoutEligibilityDelivery = {
  address: DeliveryAddressDraft | null | undefined;
  /** Authoritative quote — eligibility uses status === VALID only. */
  quote: DeliveryQuote | null | undefined;
};

export type CheckoutEligibilityInput = {
  items: CheckoutEligibilityItem[];
  /** Pickup confirmation — used when serviceType is PICKUP or omitted. */
  confirmed: CheckoutEligibilityConfirmed | null;
  cartStatus?: "loading" | "success" | "error" | "empty";
  pickupSlotAvailable?: boolean;
  serviceType?: "PICKUP" | "DELIVERY";
  delivery?: CheckoutEligibilityDelivery | null;
};

export type CheckoutEligibility = {
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
  serviceType: "PICKUP" | "DELIVERY";
  deliveryMode: DeliveryModeEligibility | null;
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
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return true;
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

function pushCartCommonBlocks(
  input: CheckoutEligibilityInput,
  hasItems: boolean,
  blockingReasons: string[],
): void {
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
  if (hasItems && hasIncompleteExactSelection(input.items)) {
    blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.incompleteSelection);
  }
}

/**
 * Cart checkout CTA eligibility — client gate only.
 * Server checkout validation remains authoritative.
 * DELIVERY cart gate requires postal + zone + fee + mode + calculated window.
 * Full delivery address is validated later at checkout / payment.
 */
export function getCheckoutEligibility(
  input: CheckoutEligibilityInput,
): CheckoutEligibility {
  const serviceType = input.serviceType ?? "PICKUP";
  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = itemCount > 0;
  const hasValidPrices =
    hasItems && input.items.every((item) => item.priceAvailable === true);
  const exactSelectionComplete = !hasIncompleteExactSelection(input.items);
  const blockingReasons: string[] = [];

  pushCartCommonBlocks(input, hasItems, blockingReasons);

  let hasBoutiqueId = false;
  let hasPickupDate = false;
  let hasTimeSlotId = false;
  const pickupSlotAvailable = input.pickupSlotAvailable !== false;
  let deliveryMode: DeliveryModeEligibility | null = null;

  if (serviceType === "DELIVERY") {
    const quote = input.delivery?.quote ?? null;
    deliveryMode = quote?.deliveryMode ?? "EARLIEST_AVAILABLE";
    const postal =
      quote?.postalCode?.trim() ||
      input.delivery?.address?.postalCode?.trim() ||
      "";

    if (hasItems && !postal) {
      blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.missingDeliveryPostal);
    } else if (hasItems && !hasValidDeliveryPostalCode(postal)) {
      blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.invalidDeliveryPostal);
    }

    const postalOk = hasValidDeliveryPostalCode(postal);
    const resolvedStatus = quote ? resolveDeliveryQuoteStatus(quote) : "EMPTY";

    if (hasItems && postalOk) {
      if (resolvedStatus === "UNSUPPORTED") {
        blockingReasons.push(
          CHECKOUT_BLOCKING_MESSAGES.unsupportedDeliveryZone,
        );
      } else if (
        resolvedStatus === "EXPIRED" ||
        resolvedStatus === "INVALID" ||
        resolvedStatus === "EMPTY"
      ) {
        // EXPIRED/INVALID/EMPTY all require recalculating delivery in cart —
        // there is no separate "enter postal" copy distinct from this message.
        blockingReasons.push(CHECKOUT_BLOCKING_MESSAGES.deliveryUnavailable);
      } else if (resolvedStatus === "PENDING") {
        blockingReasons.push(
          deliveryMode === "PREORDER"
            ? CHECKOUT_BLOCKING_MESSAGES.missingPreorderDate
            : CHECKOUT_BLOCKING_MESSAGES.deliveryUnavailable,
        );
      }
      // resolvedStatus === "VALID" — no blocking reason; canCheckout follows
      // isDeliveryQuoteValidForCheckout(quote) via the absence of any reason.
    }
  } else {
    hasBoutiqueId =
      typeof input.confirmed?.boutiqueId === "string" &&
      input.confirmed.boutiqueId.trim().length > 0;
    hasPickupDate =
      typeof input.confirmed?.dateKey === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.confirmed.dateKey);
    hasTimeSlotId =
      typeof input.confirmed?.timeSlotId === "string" &&
      input.confirmed.timeSlotId.trim().length > 0;

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
    serviceType,
    deliveryMode,
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
      reason:
        blockingReasons[0] ?? CHECKOUT_BLOCKING_MESSAGES.missingPickupDateTime,
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

/** Payment-step gate: full delivery address required for DELIVERY. */
export function isDeliveryAddressReadyForPayment(
  address: DeliveryAddressDraft | null | undefined,
): boolean {
  return isCompleteDeliveryAddress(address);
}

export function logCheckoutEligibilityDiagnostics(
  diagnostics: CheckoutEligibilityDiagnostics,
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[checkout-eligibility]", diagnostics);
}
