"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPriceThb } from "@/lib/api/catalog";
import { usePickup } from "../pickup/PickupContext";
import { useCart } from "./CartContext";
import {
  getCheckoutEligibility,
  logCheckoutEligibilityDiagnostics,
} from "./checkout-eligibility";

type CartCheckoutFooterProps = {
  variant?: "desktop" | "drawer";
};

export default function CartCheckoutFooter({
  variant = "desktop",
}: CartCheckoutFooterProps) {
  const router = useRouter();
  const { items, itemCount, subtotalThb, status, closeDrawer } = useCart();
  const { confirmed, openPickupSelection } = usePickup();

  const eligibility = getCheckoutEligibility({
    items: items.map((item) => ({
      quantity: item.quantity,
      modifiers: item.modifiers,
      exactSelectionQuantity: item.exactSelectionQuantity,
      available: item.productAvailable,
      priceAvailable: item.priceAvailable,
    })),
    confirmed: confirmed
      ? {
          boutiqueId: confirmed.boutique.id,
          dateKey: confirmed.dateKey,
          timeSlotId: confirmed.timeSlot.id,
        }
      : null,
    cartStatus: status,
  });

  useEffect(() => {
    if (!eligibility.ctaVisible) return;
    logCheckoutEligibilityDiagnostics(eligibility.diagnostics);
    // Log when eligibility inputs change, not on every object identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- diagnostics snapshot
  }, [
    eligibility.ctaVisible,
    eligibility.canCheckout,
    eligibility.reason,
    itemCount,
    confirmed?.boutique.id,
    confirmed?.dateKey,
    confirmed?.timeSlot.id,
  ]);

  if (!eligibility.ctaVisible) return null;

  const subtotalLabel = formatPriceThb(subtotalThb);

  return (
    <div
      id="info-total-cart"
      className="cart-checkout-footer"
      data-testid="cart-checkout-footer"
    >
      <div className="block-4 total-price-block-1" id="content-cart-price">
        <div className="summary-price-list">
          <div className="summary-price-item total-row">
            <div className="summary-price__title">Subtotal</div>
            <div className="summary-price__price">{subtotalLabel}</div>
          </div>
        </div>
      </div>

      <div className="block-4 total-price-block" id="content-cart-checkout">
        <div className="inner bg-pink" id="checkoutArea4Click">
          {eligibility.reason ? (
            <div
              className="note danger_message danger_red_message cart-pickup-gate"
              role="status"
              data-testid="checkout-blocking-reason"
            >
              {eligibility.reason}{" "}
              {eligibility.reason.includes("boutique") ||
              eligibility.reason.includes("pickup date") ||
              eligibility.reason.includes("pickup time") ? (
                <button
                  type="button"
                  className="cart-pickup-gate-link"
                  onClick={() =>
                    openPickupSelection({
                      step: eligibility.reason?.includes("boutique")
                        ? "boutique"
                        : "datetime",
                    })
                  }
                >
                  Select service, date and time
                </button>
              ) : null}
            </div>
          ) : null}
          <button
            id="btnCheckOut"
            className="btn btn-checkout"
            type="button"
            disabled={!eligibility.canCheckout}
            aria-disabled={!eligibility.canCheckout}
            title={eligibility.reason ?? undefined}
            data-testid="cart-checkout-cta"
            onClick={() => {
              if (!eligibility.canCheckout) return;
              if (variant === "drawer") closeDrawer();
              router.push("/checkout");
            }}
          >
            <div className="checkout-all-content">
              <span className="checkout-total-amount">{subtotalLabel}</span>
              <span id="textCheckOut" className="checkout-text">
                {eligibility.label}
              </span>
              <span className="checkout-total-quantity">{itemCount}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
