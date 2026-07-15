"use client";

import type { ReactNode } from "react";
import { CartProvider } from "./CartContext";
import CartDrawer from "./CartDrawer";

export default function CartProviderShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
