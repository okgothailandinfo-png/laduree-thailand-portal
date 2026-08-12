"use client";

import { uiChrome } from "@/lib/i18n/ui-chrome";
import { useCart } from "./CartContext";

/** Mobile sticky View Cart bar control (Singapore .homepage-cart-button-display). */
export default function MobileViewCartButton() {
  const { itemCount, openDrawer } = useCart();
  const viewCart = uiChrome("cartViewLabel");

  return (
    <button
      type="button"
      className="btn btn-homepage-cart-display"
      onClick={openDrawer}
      aria-label={`${viewCart}${itemCount > 0 ? `, ${itemCount} items` : ""}`}
    >
      <span className="homepage-cart-display__view-cart">{viewCart}</span>
      <span className="homepage-cart-display__quatity-box custom-text-style">
        <span className="homepage-cart-display__quatity" aria-hidden="true">
          {itemCount}
        </span>
      </span>
    </button>
  );
}
