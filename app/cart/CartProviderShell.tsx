"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  // Admin CMS must not inherit storefront cart / pickup chrome.
  if (isAdmin) {
    return <>{children}</>;
  }

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
