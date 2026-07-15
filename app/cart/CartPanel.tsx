"use client";

import { useCart } from "./CartContext";
import "./cart.css";

type CartPanelProps = {
  variant?: "desktop" | "drawer";
};

export default function CartPanel({ variant = "desktop" }: CartPanelProps) {
  const {
    items,
    itemCount,
    updateQuantity,
    removeItem,
    clearItems,
    closeDrawer,
  } = useCart();

  const isEmpty = items.length === 0;

  return (
    <div
      className={`cart-panel${variant === "desktop" ? " desktop-cart-panel" : ""}`}
    >
      <div className="content-cart" id="content-cart">
        <div id="box-content-cart">
          <div className="all-product-item">
            <div className="block-3 order-list list-unstyled">
              <div className="items-added">
                <div className="row-items">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>Item(s) Added</span>
                    <button
                      type="button"
                      title="Clear items"
                      className="clear-items"
                      id="clear-items"
                      disabled={isEmpty}
                      onClick={() => {
                        if (
                          !isEmpty &&
                          window.confirm("Clear all items in the cart!")
                        ) {
                          clearItems();
                        }
                      }}
                    >
                      Clear items
                    </button>
                  </div>
                </div>
              </div>

              {isEmpty ? (
                <div id="ErrNothingToCheckout" className="item cart-empty">
                  <div className="note danger_message danger_red_message">
                    Your cart is empty.Add at least 1 item to checkout!
                  </div>
                </div>
              ) : (
                <ul id="box-cart-item">
                  {items.map((item) => (
                    <li key={item.id} className="item">
                      <div className="inner">
                        <div className="item-row">
                          <div className="cart-item-thumb">
                            <img src={item.imageSrc} alt="" />
                          </div>
                          <div className="cart-item-main">
                            <div className="mycart-title-product order-name">
                              {item.name}
                            </div>
                            <div className="order-price">
                              <span className="price">฿ —</span>
                            </div>
                            {item.modifiers.length > 0 ? (
                              <div className="order-modifier">
                                {item.modifiers.map((modifier) => (
                                  <span
                                    key={`${item.id}-${modifier.label}`}
                                    className="note-1"
                                  >
                                    {modifier.quantity
                                      ? `${modifier.quantity}× ${modifier.label}`
                                      : modifier.label}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {item.note ? (
                              <div className="note">{item.note}</div>
                            ) : null}
                            <div className="action-block">
                              <div className="cart-qty-group">
                                <button
                                  type="button"
                                  className="btn-number minus"
                                  aria-label={`Decrease ${item.name}`}
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                >
                                  −
                                </button>
                                <input
                                  type="text"
                                  className="quantity-item"
                                  value={String(item.quantity)}
                                  readOnly
                                  aria-label={`${item.name} quantity`}
                                />
                                <button
                                  type="button"
                                  className="btn-number plus"
                                  aria-label={`Increase ${item.name}`}
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                className="delete-link"
                                aria-label={`Remove ${item.name}`}
                                title="Remove item"
                                onClick={() => removeItem(item.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="info-total-cart">
        <div className="block-4 total-price-block-1" id="content-cart-price">
          <div className="summary-price-list">
            <div className="summary-price-item">
              <div className="summary-price__title">Subtotal</div>
              <div className="summary-price__price">฿ —</div>
            </div>
            <div className="summary-price-item">
              <div className="summary-price__title">Item(s) Total</div>
              <div className="summary-price__price">฿ —</div>
            </div>
            <div className="summary-price-item">
              <div className="summary-price__title">Tax</div>
              <div className="summary-price__content">฿ —</div>
            </div>
            <div className="summary-price-item total-row">
              <div className="summary-price__title">Total</div>
              <div className="summary-price__price">฿ —</div>
            </div>
          </div>
        </div>

        <div className="block-4 total-price-block" id="content-cart-checkout">
          <div className="inner bg-pink" id="checkoutArea4Click">
            <button
              id="btnCheckOut"
              className="btn btn-checkout"
              type="button"
              disabled={isEmpty}
              onClick={() => {
                if (variant === "drawer") closeDrawer();
              }}
            >
              <div className="checkout-all-content">
                <span className="checkout-total-amount">฿ —</span>
                <span id="textCheckOut" className="checkout-text">
                  Checkout
                </span>
                <span className="checkout-total-quantity">{itemCount}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
