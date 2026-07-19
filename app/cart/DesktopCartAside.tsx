"use client";

import CartFulfillmentStrip from "../pickup/CartFulfillmentStrip";
import CartCheckoutFooter from "./CartCheckoutFooter";
import CartPanel from "./CartPanel";
import "./cart.css";

/**
 * Desktop cart rail:
 * 1. Pickup summary (non-scrolling)
 * 2. Scrollable line items
 * 3. Pinned checkout footer inside the sticky viewport
 */
export default function DesktopCartAside() {
  return (
    <div className="cart-block cart-block--split">
      <div className="cart-block-pickup">
        <CartFulfillmentStrip />
      </div>
      <div className="cart-block-body" id="containmycart">
        <CartPanel variant="desktop" includeFooter={false} />
      </div>
      <div className="cart-block-footer">
        <CartCheckoutFooter variant="desktop" />
      </div>
    </div>
  );
}
