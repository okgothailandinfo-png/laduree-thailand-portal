"use client";

import CartFulfillmentStrip from "../pickup/CartFulfillmentStrip";
import CartPanel from "./CartPanel";

/** Desktop sticky cart rail content (Singapore aside.sidebar .cart-block). */
export default function DesktopCartAside() {
  return (
    <div className="cart-block">
      <CartFulfillmentStrip />

      <div id="containmycart">
        <CartPanel variant="desktop" />
      </div>
    </div>
  );
}
