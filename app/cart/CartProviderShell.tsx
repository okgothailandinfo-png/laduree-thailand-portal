"use client";

import type { ReactNode } from "react";
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
        {children}
        <CartDrawer />
        <PickupSelectionModal />
      </CartProvider>
    </PickupProvider>
  );
}
