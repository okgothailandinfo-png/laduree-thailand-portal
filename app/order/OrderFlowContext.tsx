"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/payment/methods";

export type MockPaymentMethod = PaymentMethodId;

export const MOCK_PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;

export type MockPlacedOrder = {
  orderNumber: string;
  paymentMethod: MockPaymentMethod;
  paymentMethodLabel: string;
  safeDisplay?: string | null;
};

type OrderFlowContextValue = {
  selectedPaymentMethod: MockPaymentMethod | null;
  setSelectedPaymentMethod: (method: MockPaymentMethod | null) => void;
  placedOrder: MockPlacedOrder | null;
  placeMockOrder: (
    method: MockPaymentMethod,
    opts?: { safeDisplay?: string | null; orderNumber?: string },
  ) => MockPlacedOrder;
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

  const placeMockOrder = useCallback(
    (
      method: MockPaymentMethod,
      opts?: { safeDisplay?: string | null; orderNumber?: string },
    ) => {
      const order: MockPlacedOrder = {
        orderNumber: opts?.orderNumber ?? createMockOrderNumber(),
        paymentMethod: method,
        paymentMethodLabel: MOCK_PAYMENT_METHOD_LABELS[method],
        safeDisplay: opts?.safeDisplay ?? null,
      };
      setSelectedPaymentMethod(method);
      setPlacedOrder(order);
      return order;
    },
    [],
  );

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
