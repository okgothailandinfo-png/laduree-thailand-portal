"use client";

import CatalogStatus from "../catalog/CatalogStatus";
import { formatPriceThb } from "@/lib/api/catalog";
import { useCart } from "./CartContext";
import CartCheckoutFooter from "./CartCheckoutFooter";
import "./cart.css";

type CartPanelProps = {
  variant?: "desktop" | "drawer";
  /** When false, only the scrollable line items render (footer is composed outside). */
  includeFooter?: boolean;
};

export default function CartPanel({
  variant = "desktop",
  includeFooter = true,
}: CartPanelProps) {
  const {
    items,
    status,
    errorMessage,
    reloadCart,
    updateQuantity,
    removeItem,
    clearItems,
  } = useCart();

  const isEmpty = items.length === 0;
  const showLoadState =
    status === "loading" || (status === "error" && isEmpty);

  return (
    <div
      className={`cart-panel${variant === "desktop" ? " desktop-cart-panel" : ""}${
        includeFooter ? "" : " cart-panel--items-only"
      }`}
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
                      disabled={isEmpty || status === "loading"}
                      onClick={() => {
                        if (
                          !isEmpty &&
                          window.confirm("Clear all items in the cart!")
                        ) {
                          void clearItems();
                        }
                      }}
                    >
                      Clear items
                    </button>
                  </div>
                </div>
              </div>

              {showLoadState ? (
                <div className="cart-status-wrap">
                  <CatalogStatus
                    status={status === "loading" ? "loading" : "error"}
                    errorMessage={errorMessage}
                    onRetry={status === "error" ? reloadCart : undefined}
                  />
                </div>
              ) : (
                <>
                  {errorMessage && status !== "error" ? (
                    <div className="cart-status-wrap" role="alert">
                      <CatalogStatus
                        status="error"
                        errorMessage={errorMessage}
                        onRetry={reloadCart}
                      />
                    </div>
                  ) : null}

                  {isEmpty ? (
                    <div id="ErrNothingToCheckout" className="item cart-empty">
                      <div className="note danger_message danger_red_message">
                        Your cart is empty.Add at least 1 item to checkout!
                      </div>
                    </div>
                  ) : (
                    <ul id="box-cart-item">
                      {items.map((item) => {
                        const priceLabel = formatPriceThb(item.unitPriceThb);
                        const lineInvalid =
                          !item.priceAvailable || !item.productAvailable;
                        return (
                          <li
                            key={item.id}
                            className={`item${lineInvalid ? " is-invalid" : ""}`}
                          >
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
                                    <span className="price">{priceLabel}</span>
                                  </div>
                                  {lineInvalid ? (
                                    <div
                                      className="note cart-line-invalid"
                                      role="status"
                                    >
                                      {!item.productAvailable
                                        ? "This product is unavailable. Remove it to continue."
                                        : "Price unavailable for this product. Remove and re-add after the catalog price is available."}
                                    </div>
                                  ) : null}
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
                                        disabled={
                                          typeof item.exactSelectionQuantity ===
                                          "number"
                                        }
                                        onClick={() =>
                                          void updateQuantity(
                                            item.id,
                                            item.quantity - 1,
                                          )
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
                                        disabled={
                                          typeof item.exactSelectionQuantity ===
                                          "number"
                                        }
                                        onClick={() =>
                                          void updateQuantity(
                                            item.id,
                                            item.quantity + 1,
                                          )
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
                                      onClick={() => void removeItem(item.id)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {includeFooter ? <CartCheckoutFooter variant={variant} /> : null}
    </div>
  );
}
