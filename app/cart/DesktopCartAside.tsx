"use client";

import CartPanel from "./CartPanel";

/** Desktop sticky cart rail content (Singapore aside.sidebar .cart-block). */
export default function DesktopCartAside() {
  return (
    <div className="cart-block">
      <div className="tab-service-main">
        <div className="tab-service-item active">Pick-up</div>
        <button type="button" className="tab-service-item tab-service-other">
          Select Other Services
        </button>
      </div>

      <div id="divPickupMyCart" className="bg-pink cart-fulfillment">
        <div className="cart-outlet">
          <span className="cart-outlet-name">Ladurée Thailand</span>
        </div>
        <div className="cart-pickup-time">
          <span className="cart-pickup-label">Pickup Time</span>
          <button type="button" className="cart-pickup-change">
            Select a different date/time
          </button>
        </div>
      </div>

      <div id="containmycart">
        <CartPanel variant="desktop" />
      </div>
    </div>
  );
}
