"use client";

import type { ReactNode } from "react";
import { CheckoutProvider } from "../checkout/CheckoutContext";
import { OrderFlowProvider } from "../order/OrderFlowContext";
import { PickupProvider } from "../pickup/PickupContext";
import PickupSelectionModal from "../pickup/PickupSelectionModal";
import { CartProvider } from "./CartContext";
import CartDrawer from "./CartDrawer";

export default function CartProviderShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PickupProvider>
      <CartProvider>
        <CheckoutProvider>
          <OrderFlowProvider>
            {children}
            <CartDrawer />
            <PickupSelectionModal />
          </OrderFlowProvider>
        </CheckoutProvider>
      </CartProvider>
    </PickupProvider>
  );
}
