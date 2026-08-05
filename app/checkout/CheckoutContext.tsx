"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CheckoutPrefill } from "@/lib/customer/checkout-prefill";
import type { DeliveryAddressDraft } from "../pickup/pickup-availability";
import { EMPTY_DELIVERY_ADDRESS } from "../pickup/pickup-availability";
import {
  focusCheckoutField,
  getFirstInvalidFieldId,
  isValidCheckoutPhone,
  validateBuyerFields,
  validateDeliveryCheckoutForm,
  type DeliveryCheckoutFieldErrorKey,
  type DeliveryCheckoutFieldErrors,
} from "./delivery-address-form";

export type CheckoutIdentity = "guest" | "member" | null;

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

export type CheckoutFieldErrors = DeliveryCheckoutFieldErrors;

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
  /** Mark checkout as member and optionally prefill buyer / address fields. */
  continueAsMember: (prefill?: CheckoutPrefill | null) => void;
  applyMemberPrefill: (prefill: CheckoutPrefill) => void;
  applyDeliveryAddress: (address: DeliveryAddressDraft) => void;
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
  /** Focus the first invalid field after a failed validate/confirm. */
  focusFirstInvalidField: (opts?: {
    requireDeliveryAddress?: boolean;
  }) => void;
  isCheckoutInfoComplete: boolean;
  confirmed: CheckoutInfo | null;
  confirmCheckoutInfo: (opts?: { requireDeliveryAddress?: boolean }) => boolean;
  paymentPendingNotice: boolean;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

const ADDRESS_FIELD_TO_ERROR_KEY: Partial<
  Record<keyof DeliveryAddressDraft, DeliveryCheckoutFieldErrorKey>
> = {
  postalCode: "deliveryPostalCode",
  province: "deliveryProvince",
  district: "deliveryDistrict",
  subdistrict: "deliverySubdistrict",
  address: "deliveryStreetAddress",
};

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<CheckoutIdentity>(null);
  const [info, setInfo] = useState<CheckoutInfo>(emptyInfo);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [confirmed, setConfirmed] = useState<CheckoutInfo | null>(null);
  const [paymentPendingNotice, setPaymentPendingNotice] = useState(false);

  const continueAsGuest = useCallback(() => {
    setIdentity("guest");
  }, []);

  const applyMemberPrefill = useCallback((prefill: CheckoutPrefill) => {
    setInfo((current) => ({
      ...current,
      firstName: prefill.firstName,
      lastName: prefill.lastName,
      customerName: prefill.customerName,
      email: prefill.email,
      mobileNumber: prefill.mobileNumber,
      ...(prefill.deliveryAddress
        ? {
            deliveryAddress: {
              ...current.deliveryAddress,
              ...prefill.deliveryAddress,
            },
            recipientName:
              prefill.deliveryAddress.recipient || current.recipientName,
            recipientPhone:
              prefill.deliveryAddress.phone || current.recipientPhone,
          }
        : {}),
    }));
    setErrors({});
    setPaymentPendingNotice(false);
  }, []);

  const continueAsMember = useCallback(
    (prefill?: CheckoutPrefill | null) => {
      setIdentity("member");
      if (prefill) applyMemberPrefill(prefill);
    },
    [applyMemberPrefill],
  );

  const applyDeliveryAddress = useCallback((address: DeliveryAddressDraft) => {
    setInfo((current) => ({
      ...current,
      deliveryAddress: { ...address },
      recipientName: address.recipient || current.recipientName,
      recipientPhone: address.phone || current.recipientPhone,
    }));
    setErrors({});
    setPaymentPendingNotice(false);
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
        const errorKey = key as DeliveryCheckoutFieldErrorKey;
        if (!current[errorKey] && !current.form) return current;
        const next = { ...current };
        delete next[errorKey];
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
        const errorKey = ADDRESS_FIELD_TO_ERROR_KEY[key];
        if (!errorKey && !current.form) return current;
        const next = { ...current };
        if (errorKey) delete next[errorKey];
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

  const buildErrors = useCallback(
    (opts?: { requireDeliveryAddress?: boolean }): CheckoutFieldErrors => {
      if (opts?.requireDeliveryAddress) {
        return validateDeliveryCheckoutForm({
          buyer: {
            firstName: info.firstName,
            lastName: info.lastName,
            email: info.email,
            mobileNumber: info.mobileNumber,
            termsAccepted: info.termsAccepted,
            customerName: info.customerName,
          },
          address: info.deliveryAddress,
        });
      }

      const next = validateBuyerFields(
        {
          firstName: info.firstName,
          lastName: info.lastName,
          email: info.email,
          mobileNumber: info.mobileNumber,
          termsAccepted: info.termsAccepted,
          customerName: info.customerName,
        },
        { mode: "PICKUP" },
      );
      const recipientPhone = info.recipientPhone.trim();
      if (recipientPhone && !isValidCheckoutPhone(recipientPhone)) {
        next.recipientPhone = "Recipient Phone is invalid.";
      }
      return next;
    },
    [info],
  );

  const validate = useCallback(
    (opts?: { requireDeliveryAddress?: boolean }) => {
      const next = buildErrors(opts);
      setErrors(next);
      return Object.keys(next).length === 0;
    },
    [buildErrors],
  );

  const focusFirstInvalidField = useCallback(
    (opts?: { requireDeliveryAddress?: boolean }) => {
      const next = buildErrors(opts);
      setErrors(next);
      const order = opts?.requireDeliveryAddress
        ? ([
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
          ] as DeliveryCheckoutFieldErrorKey[])
        : ([
            "customerName",
            "mobileNumber",
            "email",
            "recipientPhone",
            "termsAccepted",
          ] as DeliveryCheckoutFieldErrorKey[]);
      focusCheckoutField(getFirstInvalidFieldId(next, order));
    },
    [buildErrors],
  );

  const confirmCheckoutInfo = useCallback(
    (opts?: { requireDeliveryAddress?: boolean }) => {
      const next = buildErrors(opts);
      setErrors(next);
      if (Object.keys(next).length > 0) {
        setConfirmed(null);
        setPaymentPendingNotice(false);
        const order = opts?.requireDeliveryAddress
          ? ([
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
            ] as DeliveryCheckoutFieldErrorKey[])
          : ([
              "customerName",
              "mobileNumber",
              "email",
              "recipientPhone",
              "termsAccepted",
            ] as DeliveryCheckoutFieldErrorKey[]);
        focusCheckoutField(getFirstInvalidFieldId(next, order));
        return false;
      }

      const snapshot: CheckoutInfo = {
        ...info,
        firstName:
          info.firstName.trim() ||
          info.customerName.trim().split(/\s+/)[0] ||
          "",
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
    [buildErrors, info],
  );

  const value = useMemo<CheckoutContextValue>(
    () => ({
      identity,
      continueAsGuest,
      continueAsMember,
      applyMemberPrefill,
      applyDeliveryAddress,
      info,
      setField,
      setDeliveryAddressField,
      seedDeliveryPostal,
      errors,
      clearErrors,
      validate,
      focusFirstInvalidField,
      isCheckoutInfoComplete: confirmed !== null,
      confirmed,
      confirmCheckoutInfo,
      paymentPendingNotice,
    }),
    [
      identity,
      continueAsGuest,
      continueAsMember,
      applyMemberPrefill,
      applyDeliveryAddress,
      info,
      setField,
      setDeliveryAddressField,
      seedDeliveryPostal,
      errors,
      clearErrors,
      validate,
      focusFirstInvalidField,
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
