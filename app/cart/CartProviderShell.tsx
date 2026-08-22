"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CheckoutProvider } from "../checkout/CheckoutContext";
import { CustomerSessionProvider } from "../customer/CustomerSessionContext";
import { OrderFlowProvider } from "../order/OrderFlowContext";
import { PickupProvider } from "../pickup/PickupContext";
import PickupSelectionModal from "../pickup/PickupSelectionModal";
import { ConsentProvider } from "../consent/ConsentContext";
import CookieConsentBanner from "../consent/CookieConsentBanner";
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
    <CustomerSessionProvider>
      <ConsentProvider>
        <PickupProvider>
          <CartProvider>
            <CheckoutProvider>
              <OrderFlowProvider>
                {children}
                <CartDrawer />
                <PickupSelectionModal />
                <CookieConsentBanner />
              </OrderFlowProvider>
            </CheckoutProvider>
          </CartProvider>
        </PickupProvider>
      </ConsentProvider>
    </CustomerSessionProvider>
  );
}
