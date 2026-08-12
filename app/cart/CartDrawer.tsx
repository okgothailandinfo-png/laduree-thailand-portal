"use client";

import { useEffect, useId, useRef } from "react";
import {
  isFocusableElement,
  trapTabKey,
} from "@/lib/a11y/dialog-focus";
import { uiChrome } from "@/lib/i18n/ui-chrome";
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
 *
 * Sprint 33A: Escape, focus trap, initial focus, restore focus, inert when closed.
 */
export default function CartDrawer() {
  const { isDrawerOpen, closeDrawer, itemCount } = useCart();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (isFocusableElement(document.activeElement)) {
      previouslyFocusedRef.current = document.activeElement;
    }
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(t);
      const restore = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (restore && document.contains(restore)) {
        restore.focus();
      }
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (panelRef.current) {
        trapTabKey(event, panelRef.current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  return (
    <div
      className={`cart-drawer-root${isDrawerOpen ? " is-open" : ""}`}
      aria-hidden={!isDrawerOpen}
      {...(!isDrawerOpen ? { inert: true } : {})}
    >
      <button
        type="button"
        className="cart-drawer-backdrop"
        aria-label={uiChrome("cartCloseLabel")}
        tabIndex={isDrawerOpen ? 0 : -1}
        onClick={closeDrawer}
      />
      <div
        ref={panelRef}
        className="cart-drawer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="cart-drawer-header">
          <h2 id={titleId}>
            {uiChrome("cartViewLabel")}
            {itemCount > 0 ? ` (${itemCount})` : ""}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="cart-drawer-close"
            aria-label={uiChrome("cartCloseLabel")}
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
