/**
 * Single Checkout view-model derived from the authoritative deliveryQuote.
 * Summary, unavailable banner, and Continue to Payment must all use this.
 */

import { CHECKOUT_BLOCKING_MESSAGES } from "../cart/checkout-eligibility";
import { DELIVERY_MESSAGES } from "../pickup/pickup-availability";
import {
  isDeliveryQuoteValidForCheckout,
  resolveDeliveryQuoteStatus,
  type DeliveryQuote,
  type DeliveryQuoteStatus,
} from "../pickup/delivery-quote";

export const DELIVERY_POSTAL_RECALCULATE_MESSAGE =
  "Your postal code has changed. Please recalculate delivery in cart.";

export type CheckoutDeliveryView = {
  status: DeliveryQuoteStatus;
  /** True only when resolveDeliveryQuoteStatus === VALID. */
  isValid: boolean;
  postalCode: string;
  deliveryDate: string | null;
  deliveryWindow: {
    id: string;
    label: string;
    start: string;
    end: string;
  } | null;
  deliveryFee: number | null;
  relativeLabel: "Today" | "Tomorrow" | null;
  /** Show Delivery Time / Fee / trusted postal from quote. */
  showSummary: boolean;
  /**
   * Show quote-status banner when quote exists but is not VALID.
   * Never used for missing address field errors (those are field-level).
   */
  showUnavailableBanner: boolean;
  /** Customer-facing reason for non-VALID quote — never a missing-field message. */
  bannerMessage: string | null;
  /** Enable Continue to Payment for delivery. */
  canContinueToPayment: boolean;
};

export function bannerMessageForDeliveryQuoteStatus(
  status: DeliveryQuoteStatus,
): string | null {
  switch (status) {
    case "VALID":
      return null;
    case "INVALID":
      return DELIVERY_POSTAL_RECALCULATE_MESSAGE;
    case "EXPIRED":
      return DELIVERY_MESSAGES.quoteExpired;
    case "UNSUPPORTED":
      return CHECKOUT_BLOCKING_MESSAGES.unsupportedDeliveryZone;
    case "PENDING":
      return CHECKOUT_BLOCKING_MESSAGES.missingPreorderDate;
    case "EMPTY":
      return DELIVERY_MESSAGES.enterPostalInCart;
    default:
      return CHECKOUT_BLOCKING_MESSAGES.deliveryUnavailable;
  }
}

export function getCheckoutDeliveryView(
  quote: DeliveryQuote | null | undefined,
): CheckoutDeliveryView {
  if (!quote) {
    return {
      status: "EMPTY",
      isValid: false,
      postalCode: "",
      deliveryDate: null,
      deliveryWindow: null,
      deliveryFee: null,
      relativeLabel: null,
      showSummary: false,
      showUnavailableBanner: false,
      bannerMessage: null,
      canContinueToPayment: false,
    };
  }

  const status = resolveDeliveryQuoteStatus(quote);
  const isValid =
    status === "VALID" && isDeliveryQuoteValidForCheckout(quote);

  return {
    status,
    isValid,
    postalCode: quote.postalCode,
    deliveryDate: isValid ? quote.deliveryDate : null,
    deliveryWindow: isValid ? quote.deliveryWindow : null,
    deliveryFee: isValid ? quote.deliveryFee : null,
    relativeLabel: isValid ? quote.relativeLabel : null,
    showSummary: isValid,
    showUnavailableBanner: !isValid,
    bannerMessage: isValid ? null : bannerMessageForDeliveryQuoteStatus(status),
    canContinueToPayment: isValid,
  };
}
