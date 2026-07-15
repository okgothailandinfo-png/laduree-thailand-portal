"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MockPaymentMethod =
  | "credit-card"
  | "promptpay-qr"
  | "apple-pay"
  | "google-pay";

export const MOCK_PAYMENT_METHOD_LABELS: Record<MockPaymentMethod, string> = {
  "credit-card": "Credit Card",
  "promptpay-qr": "PromptPay QR",
  "apple-pay": "Apple Pay",
  "google-pay": "Google Pay",
};

export type MockPlacedOrder = {
  orderNumber: string;
  paymentMethod: MockPaymentMethod;
  paymentMethodLabel: string;
};

type OrderFlowContextValue = {
  selectedPaymentMethod: MockPaymentMethod | null;
  setSelectedPaymentMethod: (method: MockPaymentMethod | null) => void;
  placedOrder: MockPlacedOrder | null;
  placeMockOrder: (method: MockPaymentMethod) => MockPlacedOrder;
  clearPlacedOrder: () => void;
  isOrderPlaced: boolean;
};

const OrderFlowContext = createContext<OrderFlowContextValue | null>(null);

function createMockOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  return `MOCK-${stamp}`;
}

export function OrderFlowProvider({ children }: { children: ReactNode }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<MockPaymentMethod | null>(null);
  const [placedOrder, setPlacedOrder] = useState<MockPlacedOrder | null>(null);

  const placeMockOrder = useCallback((method: MockPaymentMethod) => {
    const order: MockPlacedOrder = {
      orderNumber: createMockOrderNumber(),
      paymentMethod: method,
      paymentMethodLabel: MOCK_PAYMENT_METHOD_LABELS[method],
    };
    setSelectedPaymentMethod(method);
    setPlacedOrder(order);
    return order;
  }, []);

  const clearPlacedOrder = useCallback(() => {
    setPlacedOrder(null);
  }, []);

  const value = useMemo<OrderFlowContextValue>(
    () => ({
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      placedOrder,
      placeMockOrder,
      clearPlacedOrder,
      isOrderPlaced: placedOrder !== null,
    }),
    [
      selectedPaymentMethod,
      placedOrder,
      placeMockOrder,
      clearPlacedOrder,
    ],
  );

  return (
    <OrderFlowContext.Provider value={value}>
      {children}
    </OrderFlowContext.Provider>
  );
}

export function useOrderFlow() {
  const ctx = useContext(OrderFlowContext);
  if (!ctx) {
    throw new Error("useOrderFlow must be used within OrderFlowProvider");
  }
  return ctx;
}
