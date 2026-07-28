"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DeliveryAddressDraft } from "../pickup/pickup-availability";
import {
  EMPTY_DELIVERY_ADDRESS,
  hasValidDeliveryPostalCode,
  isCompleteDeliveryAddress,
} from "../pickup/pickup-availability";

export type CheckoutIdentity = "guest" | null;

export type CheckoutInfo = {
  firstName: string;
  lastName: string;
  /** @deprecated Prefer firstName + lastName; kept for Pickup form compatibility. */
  customerName: string;
  mobileNumber: string;
  email: string;
  recipientName: string;
  recipientPhone: string;
  specialRequest: string;
  termsAccepted: boolean;
  deliveryAddress: DeliveryAddressDraft;
};

export type CheckoutFieldErrors = Partial<
  Record<keyof CheckoutInfo | "form" | "deliveryAddress", string>
>;

const emptyInfo: CheckoutInfo = {
  firstName: "",
  lastName: "",
  customerName: "",
  mobileNumber: "",
  email: "",
  recipientName: "",
  recipientPhone: "",
  specialRequest: "",
  termsAccepted: false,
  deliveryAddress: { ...EMPTY_DELIVERY_ADDRESS },
};

type CheckoutContextValue = {
  identity: CheckoutIdentity;
  continueAsGuest: () => void;
  info: CheckoutInfo;
  setField: <K extends keyof CheckoutInfo>(
    key: K,
    value: CheckoutInfo[K],
  ) => void;
  setDeliveryAddressField: (
    key: keyof DeliveryAddressDraft,
    value: string,
  ) => void;
  seedDeliveryPostal: (postalCode: string) => void;
  errors: CheckoutFieldErrors;
  clearErrors: () => void;
  validate: (opts?: { requireDeliveryAddress?: boolean }) => boolean;
  isCheckoutInfoComplete: boolean;
  confirmed: CheckoutInfo | null;
  confirmCheckoutInfo: (opts?: { requireDeliveryAddress?: boolean }) => boolean;
  paymentPendingNotice: boolean;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  const digits = value.replace(/[\s\-()]/g, "");
  return /^\+?\d{8,15}$/.test(digits);
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<CheckoutIdentity>(null);
  const [info, setInfo] = useState<CheckoutInfo>(emptyInfo);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [confirmed, setConfirmed] = useState<CheckoutInfo | null>(null);
  const [paymentPendingNotice, setPaymentPendingNotice] = useState(false);

  const continueAsGuest = useCallback(() => {
    setIdentity("guest");
  }, []);

  const setField = useCallback(
    <K extends keyof CheckoutInfo>(key: K, value: CheckoutInfo[K]) => {
      setInfo((current) => {
        const next = { ...current, [key]: value };
        if (key === "firstName" || key === "lastName") {
          next.customerName =
            `${String(next.firstName)} ${String(next.lastName)}`.trim();
        }
        if (key === "customerName" && typeof value === "string") {
          const parts = value.trim().split(/\s+/).filter(Boolean);
          next.firstName = parts[0] ?? "";
          next.lastName = parts.slice(1).join(" ");
        }
        return next;
      });
      setErrors((current) => {
        if (!current[key] && !current.form) return current;
        const next = { ...current };
        delete next[key];
        delete next.form;
        return next;
      });
      setPaymentPendingNotice(false);
    },
    [],
  );

  const setDeliveryAddressField = useCallback(
    (key: keyof DeliveryAddressDraft, value: string) => {
      setInfo((current) => ({
        ...current,
        deliveryAddress: { ...current.deliveryAddress, [key]: value },
        ...(key === "phone" ? { recipientPhone: value } : {}),
        ...(key === "recipient" ? { recipientName: value } : {}),
      }));
      setErrors((current) => {
        if (!current.deliveryAddress && !current.form) return current;
        const next = { ...current };
        delete next.deliveryAddress;
        delete next.form;
        return next;
      });
      setPaymentPendingNotice(false);
    },
    [],
  );

  const seedDeliveryPostal = useCallback((postalCode: string) => {
    setInfo((current) => {
      if (current.deliveryAddress.postalCode.trim()) return current;
      return {
        ...current,
        deliveryAddress: {
          ...current.deliveryAddress,
          postalCode,
        },
      };
    });
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const validate = useCallback(
    (opts?: { requireDeliveryAddress?: boolean }) => {
      const next: CheckoutFieldErrors = {};
      const firstName = info.firstName.trim() || info.customerName.trim();
      const lastName = info.lastName.trim();
      const mobile = info.mobileNumber.trim();
      const email = info.email.trim();
      const recipientPhone = info.recipientPhone.trim();

      if (!firstName) next.firstName = "First Name is required.";
      if (!lastName && !info.customerName.trim()) {
        next.lastName = "Last Name is required.";
      }
      if (!mobile) next.mobileNumber = "Mobile Number is required.";
      else if (!isValidPhone(mobile)) {
        next.mobileNumber = "Mobile Number is invalid.";
      }
      if (!email) next.email = "Email is required.";
      else if (!isValidEmail(email)) next.email = "Email is invalid.";
      if (recipientPhone && !isValidPhone(recipientPhone)) {
        next.recipientPhone = "Recipient Phone is invalid.";
      }
      if (!info.termsAccepted) {
        next.termsAccepted = "Terms & Conditions must be accepted.";
      }

      if (opts?.requireDeliveryAddress) {
        const address = {
          ...info.deliveryAddress,
          recipient:
            info.deliveryAddress.recipient.trim() ||
            info.recipientName.trim() ||
            `${info.firstName} ${info.lastName}`.trim() ||
            info.customerName.trim(),
          phone:
            info.deliveryAddress.phone.trim() ||
            info.recipientPhone.trim() ||
            mobile,
        };
        if (!hasValidDeliveryPostalCode(address.postalCode)) {
          next.deliveryAddress = "The Postal Code field is required.";
        } else if (!isCompleteDeliveryAddress(address)) {
          next.deliveryAddress = "Wrong postal code or address";
        }
      }

      setErrors(next);
      return Object.keys(next).length === 0;
    },
    [info],
  );

  const confirmCheckoutInfo = useCallback(
    (opts?: { requireDeliveryAddress?: boolean }) => {
      if (!validate(opts)) {
        setConfirmed(null);
        setPaymentPendingNotice(false);
        return false;
      }

      const snapshot: CheckoutInfo = {
        ...info,
        firstName: info.firstName.trim() || info.customerName.trim().split(/\s+/)[0] || "",
        lastName:
          info.lastName.trim() ||
          info.customerName.trim().split(/\s+/).slice(1).join(" "),
        customerName:
          info.customerName.trim() ||
          `${info.firstName} ${info.lastName}`.trim(),
        mobileNumber: info.mobileNumber.trim(),
        email: info.email.trim(),
        recipientName: info.recipientName.trim(),
        recipientPhone: info.recipientPhone.trim(),
        specialRequest: info.specialRequest.trim(),
        deliveryAddress: { ...info.deliveryAddress },
      };
      setConfirmed(snapshot);
      setPaymentPendingNotice(true);
      return true;
    },
    [info, validate],
  );

  const value = useMemo<CheckoutContextValue>(
    () => ({
      identity,
      continueAsGuest,
      info,
      setField,
      setDeliveryAddressField,
      seedDeliveryPostal,
      errors,
      clearErrors,
      validate,
      isCheckoutInfoComplete: confirmed !== null,
      confirmed,
      confirmCheckoutInfo,
      paymentPendingNotice,
    }),
    [
      identity,
      continueAsGuest,
      info,
      setField,
      setDeliveryAddressField,
      seedDeliveryPostal,
      errors,
      clearErrors,
      validate,
      confirmed,
      confirmCheckoutInfo,
      paymentPendingNotice,
    ],
  );

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) {
    throw new Error("useCheckout must be used within CheckoutProvider");
  }
  return ctx;
}
