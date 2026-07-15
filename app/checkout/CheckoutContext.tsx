"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CheckoutInfo = {
  customerName: string;
  mobileNumber: string;
  email: string;
  recipientName: string;
  recipientPhone: string;
  specialRequest: string;
  termsAccepted: boolean;
};

export type CheckoutFieldErrors = Partial<
  Record<keyof CheckoutInfo | "form", string>
>;

const emptyInfo: CheckoutInfo = {
  customerName: "",
  mobileNumber: "",
  email: "",
  recipientName: "",
  recipientPhone: "",
  specialRequest: "",
  termsAccepted: false,
};

type CheckoutContextValue = {
  info: CheckoutInfo;
  setField: <K extends keyof CheckoutInfo>(
    key: K,
    value: CheckoutInfo[K],
  ) => void;
  errors: CheckoutFieldErrors;
  clearErrors: () => void;
  validate: () => boolean;
  isCheckoutInfoComplete: boolean;
  confirmed: CheckoutInfo | null;
  confirmCheckoutInfo: () => boolean;
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
  const [info, setInfo] = useState<CheckoutInfo>(emptyInfo);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [confirmed, setConfirmed] = useState<CheckoutInfo | null>(null);
  const [paymentPendingNotice, setPaymentPendingNotice] = useState(false);

  const setField = useCallback(
    <K extends keyof CheckoutInfo>(key: K, value: CheckoutInfo[K]) => {
      setInfo((current) => ({ ...current, [key]: value }));
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

  const clearErrors = useCallback(() => setErrors({}), []);

  const validate = useCallback(() => {
    const next: CheckoutFieldErrors = {};
    const name = info.customerName.trim();
    const mobile = info.mobileNumber.trim();
    const email = info.email.trim();
    const recipientPhone = info.recipientPhone.trim();

    if (!name) next.customerName = "Customer Name is required.";
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

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [info]);

  const confirmCheckoutInfo = useCallback(() => {
    if (!validate()) {
      setConfirmed(null);
      setPaymentPendingNotice(false);
      return false;
    }

    const snapshot: CheckoutInfo = {
      ...info,
      customerName: info.customerName.trim(),
      mobileNumber: info.mobileNumber.trim(),
      email: info.email.trim(),
      recipientName: info.recipientName.trim(),
      recipientPhone: info.recipientPhone.trim(),
      specialRequest: info.specialRequest.trim(),
    };
    setConfirmed(snapshot);
    setPaymentPendingNotice(true);
    return true;
  }, [info, validate]);

  const value = useMemo<CheckoutContextValue>(
    () => ({
      info,
      setField,
      errors,
      clearErrors,
      validate,
      isCheckoutInfoComplete: confirmed !== null,
      confirmed,
      confirmCheckoutInfo,
      paymentPendingNotice,
    }),
    [
      info,
      setField,
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
