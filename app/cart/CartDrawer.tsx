"use client";

import { useEffect } from "react";
import CartFulfillmentStrip from "../pickup/CartFulfillmentStrip";
import { useCart } from "./CartContext";
import CartCheckoutFooter from "./CartCheckoutFooter";
import CartPanel from "./CartPanel";
import "./cart.css";

/**
 * Cart drawer layout:
 * 1. Fixed header
 * 2. Fixed pickup summary
 * 3. Scrollable cart item body
 * 4. Fixed checkout footer (always inside the drawer viewport)
 */
export default function CartDrawer() {
  const { isDrawerOpen, closeDrawer, itemCount } = useCart();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDrawerOpen]);

  return (
    <div
      className={`cart-drawer-root${isDrawerOpen ? " is-open" : ""}`}
      aria-hidden={!isDrawerOpen}
    >
      <button
        type="button"
        className="cart-drawer-backdrop"
        aria-label="Close cart"
        onClick={closeDrawer}
      />
      <div
        className="cart-drawer-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
      >
        <div className="cart-drawer-header">
          <h2>View Cart{itemCount > 0 ? ` (${itemCount})` : ""}</h2>
          <button
            type="button"
            className="cart-drawer-close"
            aria-label="Close"
            onClick={closeDrawer}
          >
            ×
          </button>
        </div>

        <div className="cart-drawer-pickup">
          <CartFulfillmentStrip />
        </div>

        <div className="cart-drawer-body" data-testid="cart-drawer-scroll">
          <CartPanel variant="drawer" includeFooter={false} />
        </div>

        <div className="cart-drawer-footer" data-testid="cart-drawer-footer">
          <CartCheckoutFooter variant="drawer" />
        </div>
      </div>
    </div>
  );
}
