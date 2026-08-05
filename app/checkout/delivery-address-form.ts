/**
 * Sprint 22 — Delivery address form helpers (field-level validation, formatting).
 * Pure functions — safe for unit tests without React.
 */

import {
  hasValidDeliveryPostalCode,
  type DeliveryAddressDraft,
} from "../pickup/pickup-availability";

export type DeliveryAddressFormFields = {
  postalCode: string;
  province: string;
  district: string;
  subdistrict: string;
  address: string;
  building?: string;
  unitFloor?: string;
  notes?: string;
};

export type BuyerFormFields = {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  termsAccepted: boolean;
  /** Pickup-only composite name — used when first/last empty. */
  customerName?: string;
};

/** Flat error keys aligned with checkout input `id` attributes for focus. */
export type DeliveryCheckoutFieldErrorKey =
  | "firstName"
  | "lastName"
  | "email"
  | "mobileNumber"
  | "customerName"
  | "deliveryPostalCode"
  | "deliveryProvince"
  | "deliveryDistrict"
  | "deliverySubdistrict"
  | "deliveryStreetAddress"
  | "termsAccepted"
  | "recipientPhone"
  | "form";

export type DeliveryCheckoutFieldErrors = Partial<
  Record<DeliveryCheckoutFieldErrorKey, string>
>;

/** Submit focus order for Delivery checkout. */
export const DELIVERY_CHECKOUT_FOCUS_ORDER: DeliveryCheckoutFieldErrorKey[] = [
  "firstName",
  "lastName",
  "email",
  "mobileNumber",
  "deliveryPostalCode",
  "deliveryProvince",
  "deliveryDistrict",
  "deliverySubdistrict",
  "deliveryStreetAddress",
  "termsAccepted",
];

/** Submit focus order for Pickup checkout. */
export const PICKUP_CHECKOUT_FOCUS_ORDER: DeliveryCheckoutFieldErrorKey[] = [
  "customerName",
  "mobileNumber",
  "email",
  "recipientPhone",
  "termsAccepted",
];

export function isValidCheckoutEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidCheckoutPhone(value: string): boolean {
  const digits = value.replace(/[\s\-()]/g, "");
  return /^\+?\d{8,15}$/.test(digits);
}

export function validateBuyerFields(
  buyer: BuyerFormFields,
  opts: { mode: "DELIVERY" | "PICKUP" },
): DeliveryCheckoutFieldErrors {
  const next: DeliveryCheckoutFieldErrors = {};

  if (opts.mode === "DELIVERY") {
    const firstName = buyer.firstName.trim() || (buyer.customerName ?? "").trim();
    const lastName = buyer.lastName.trim();
    if (!firstName) next.firstName = "First Name is required.";
    if (!lastName && !(buyer.customerName ?? "").trim()) {
      next.lastName = "Last Name is required.";
    }
  } else {
    if (!(buyer.customerName ?? "").trim() && !buyer.firstName.trim()) {
      next.customerName = "Customer Name is required.";
    }
  }

  const mobile = buyer.mobileNumber.trim();
  if (!mobile) next.mobileNumber = "Mobile Number is required.";
  else if (!isValidCheckoutPhone(mobile)) {
    next.mobileNumber = "Mobile Number is invalid.";
  }

  const email = buyer.email.trim();
  if (!email) next.email = "Email is required.";
  else if (!isValidCheckoutEmail(email)) next.email = "Email is invalid.";

  if (!buyer.termsAccepted) {
    next.termsAccepted = "Terms & Conditions must be accepted.";
  }

  return next;
}

/**
 * Field-level delivery address validation.
 * Does not invent zone/quote errors — callers combine with quote status.
 */
export function validateDeliveryAddressFields(
  address: DeliveryAddressFormFields,
): DeliveryCheckoutFieldErrors {
  const next: DeliveryCheckoutFieldErrors = {};
  const postal = address.postalCode.trim();

  if (!postal) {
    next.deliveryPostalCode = "The Postal Code field is required.";
  } else if (!hasValidDeliveryPostalCode(postal)) {
    next.deliveryPostalCode = "Postal Code must be a 5-digit code.";
  }

  if (!address.province.trim()) {
    next.deliveryProvince = "Province is required.";
  }
  if (!address.district.trim()) {
    next.deliveryDistrict = "District is required.";
  }
  if (!address.subdistrict.trim()) {
    next.deliverySubdistrict = "Subdistrict is required.";
  }
  if (!address.address.trim()) {
    next.deliveryStreetAddress = "Street Address is required.";
  }

  return next;
}

export function validateDeliveryCheckoutForm(input: {
  buyer: BuyerFormFields;
  address: DeliveryAddressFormFields;
}): DeliveryCheckoutFieldErrors {
  return {
    ...validateBuyerFields(input.buyer, { mode: "DELIVERY" }),
    ...validateDeliveryAddressFields(input.address),
  };
}

export function getFirstInvalidFieldId(
  errors: DeliveryCheckoutFieldErrors,
  order: DeliveryCheckoutFieldErrorKey[],
): string | null {
  for (const key of order) {
    if (errors[key]) return key;
  }
  return null;
}

export function focusCheckoutField(fieldId: string | null): void {
  if (!fieldId || typeof document === "undefined") return;
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.focus();
  if ("scrollIntoView" in el) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

export type FormattableDeliveryAddress = Pick<
  DeliveryAddressDraft,
  | "address"
  | "subdistrict"
  | "district"
  | "province"
  | "postalCode"
  | "building"
  | "unitFloor"
> & {
  recipient?: string;
};

/** Single-line / multi-line friendly full Thailand delivery address. */
export function formatFullDeliveryAddress(
  address: FormattableDeliveryAddress,
): string {
  const lines: string[] = [];
  const streetParts = [address.address.trim()].filter(Boolean);
  const building = (address.building ?? "").trim();
  const unitFloor = (address.unitFloor ?? "").trim();
  if (building) streetParts.push(building);
  if (unitFloor) streetParts.push(unitFloor);
  if (streetParts.length) lines.push(streetParts.join(", "));

  const locality = [
    address.subdistrict.trim(),
    address.district.trim(),
    address.province.trim(),
    address.postalCode.trim(),
  ]
    .filter(Boolean)
    .join(", ");
  if (locality) lines.push(locality);

  return lines.join("\n");
}

export function formatFullDeliveryAddressInline(
  address: FormattableDeliveryAddress,
): string {
  return formatFullDeliveryAddress(address).replace(/\n/g, ", ");
}
