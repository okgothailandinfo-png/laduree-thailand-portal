"use client";

import { useCart } from "./CartContext";

/** Mobile sticky View Cart bar control (Singapore .homepage-cart-button-display). */
export default function MobileViewCartButton() {
  const { itemCount, openDrawer } = useCart();

  return (
    <button
      type="button"
      className="btn btn-homepage-cart-display"
      onClick={openDrawer}
    >
      <span className="homepage-cart-display__view-cart">View Cart</span>
      <span className="homepage-cart-display__quatity-box custom-text-style">
        <span className="homepage-cart-display__quatity">{itemCount}</span>
      </span>
    </button>
  );
}
