/**
 * Maps a member CustomerSession (+ optional saved address) onto checkout form fields.
 */

import {
  savedAddressToDeliveryDraft,
  type SavedAddressDeliveryDraft,
} from "./saved-addresses";
import type { CustomerSession, SavedAddress } from "./types";

export type CheckoutPrefill = {
  firstName: string;
  lastName: string;
  customerName: string;
  email: string;
  mobileNumber: string;
  deliveryAddress?: SavedAddressDeliveryDraft;
};

export function buildCheckoutPrefillFromSession(
  session: CustomerSession,
  savedAddress?: SavedAddress | null,
): CheckoutPrefill | null {
  if (session.customerType !== "member" || !session.isAuthenticated) {
    return null;
  }

  const firstName = (session.firstName ?? "").trim();
  const lastName = (session.lastName ?? "").trim();
  const customerName =
    (session.customerName ?? `${firstName} ${lastName}`).trim() ||
    `${firstName} ${lastName}`.trim();

  const prefill: CheckoutPrefill = {
    firstName,
    lastName,
    customerName,
    email: (session.email ?? "").trim(),
    mobileNumber: (session.phone ?? "").trim(),
  };

  if (savedAddress) {
    prefill.deliveryAddress = savedAddressToDeliveryDraft(savedAddress);
  }

  return prefill;
}
