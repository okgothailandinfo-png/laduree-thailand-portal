/**
 * Single Checkout view-model derived from the authoritative deliveryQuote.
 * Summary, unavailable banner, and Continue to Payment must all use this.
 */

import {
  isDeliveryQuoteValidForCheckout,
  resolveDeliveryQuoteStatus,
  type DeliveryQuote,
  type DeliveryQuoteStatus,
} from "../pickup/delivery-quote";

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
  /** Show “Delivery is not available…” when quote exists but is not VALID. */
  showUnavailableBanner: boolean;
  /** Enable Continue to Payment for delivery. */
  canContinueToPayment: boolean;
};

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
    canContinueToPayment: isValid,
  };
}
