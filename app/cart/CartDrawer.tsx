"use client";

import { useEffect } from "react";
import { useCart } from "./CartContext";
import CartPanel from "./CartPanel";
import "./cart.css";

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
        <CartPanel variant="drawer" />
      </div>
    </div>
  );
}
