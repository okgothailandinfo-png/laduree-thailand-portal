"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePickup } from "../pickup/PickupContext";
import { useCart } from "./CartContext";
import { computeOrderTotals, formatOrderTotalThb } from "../checkout/order-totals";
import { isDeliveryQuoteValidForCheckout } from "../pickup/delivery-quote";
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
  const { confirmed, confirmedSlotAvailable, openPickupSelection, invalidateDeliveryQuote } =
    usePickup();

  const serviceType = confirmed?.serviceType ?? "PICKUP";

  const eligibility = getCheckoutEligibility({
    items: items.map((item) => ({
      quantity: item.quantity,
      modifiers: item.modifiers,
      exactSelectionQuantity: item.exactSelectionQuantity,
      available: item.productAvailable,
      priceAvailable: item.priceAvailable,
    })),
    confirmed:
      confirmed?.serviceType === "PICKUP"
        ? {
            boutiqueId: confirmed.boutique.id,
            dateKey: confirmed.dateKey,
            timeSlotId: confirmed.timeSlot.id,
          }
        : null,
    cartStatus: status,
    pickupSlotAvailable: confirmedSlotAvailable,
    serviceType,
    delivery:
      confirmed?.serviceType === "DELIVERY"
        ? {
            address: confirmed.deliveryAddress,
            quote: confirmed.deliveryQuote,
          }
        : null,
  });

  useEffect(() => {
    if (!eligibility.ctaVisible) return;
    logCheckoutEligibilityDiagnostics(eligibility.diagnostics);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- diagnostics snapshot
  }, [
    eligibility.ctaVisible,
    eligibility.canCheckout,
    eligibility.reason,
    itemCount,
    confirmed?.serviceType,
    confirmed?.serviceType === "PICKUP" ? confirmed.boutique.id : null,
    confirmed?.serviceType === "PICKUP" ? confirmed.dateKey : null,
    confirmed?.serviceType === "PICKUP" ? confirmed.timeSlot.id : null,
    confirmed?.serviceType === "DELIVERY" ? confirmed.deliveryMode : null,
  ]);

  const cartSignatureRef = useRef<string | null>(null);
  const cartSignature = `${itemCount}:${subtotalThb}`;

  useEffect(() => {
    if (confirmed?.serviceType !== "DELIVERY") return;
    if (cartSignatureRef.current === null) {
      cartSignatureRef.current = cartSignature;
      return;
    }
    if (cartSignatureRef.current !== cartSignature) {
      cartSignatureRef.current = cartSignature;
      invalidateDeliveryQuote();
    }
  }, [cartSignature, confirmed?.serviceType, invalidateDeliveryQuote]);

  if (!eligibility.ctaVisible) return null;

  const deliveryFeeThb =
    confirmed?.serviceType === "DELIVERY" &&
    isDeliveryQuoteValidForCheckout(confirmed.deliveryQuote) &&
    typeof confirmed.deliveryQuote.deliveryFee === "number"
      ? confirmed.deliveryQuote.deliveryFee
      : null;
  const orderTotals = computeOrderTotals({
    serviceType: serviceType === "DELIVERY" ? "DELIVERY" : "PICKUP",
    subtotalThb,
    deliveryFeeThb,
  });
  const subtotalLabel = formatOrderTotalThb(orderTotals.subtotalThb);
  const totalLabel = formatOrderTotalThb(orderTotals.totalThb);

  function openSelectionForReason() {
    if (!eligibility.reason) {
      openPickupSelection({ step: "service" });
      return;
    }
    if (
      eligibility.reason.includes("boutique") ||
      eligibility.reason.includes("pickup date") ||
      eligibility.reason.includes("pickup time")
    ) {
      openPickupSelection({
        step: eligibility.reason.includes("boutique") ? "boutique" : "datetime",
      });
      return;
    }
    if (
      eligibility.reason.includes("postal") ||
      eligibility.reason.includes("address")
    ) {
      openPickupSelection({ step: "address" });
      return;
    }
    if (
      eligibility.reason.includes("delivery") ||
      eligibility.reason.includes("Delivery")
    ) {
      openPickupSelection({
        step:
          confirmed?.serviceType === "DELIVERY" &&
          confirmed.deliveryMode === "PREORDER"
            ? "datetime"
            : "mode",
        serviceType: "DELIVERY",
      });
      return;
    }
    openPickupSelection({ step: "service" });
  }

  return (
    <div
      id="info-total-cart"
      className="cart-checkout-footer"
      data-testid="cart-checkout-footer"
    >
      <div className="block-4 total-price-block-1" id="content-cart-price">
        <div className="summary-price-list" data-testid="cart-totals">
          <div className="summary-price-item total-row">
            <div className="summary-price__title">Subtotal</div>
            <div className="summary-price__price" data-testid="cart-subtotal">
              {subtotalLabel}
            </div>
          </div>
          {serviceType === "DELIVERY" &&
          typeof orderTotals.deliveryFeeThb === "number" ? (
            <div className="summary-price-item">
              <div className="summary-price__title">Delivery Fee</div>
              <div
                className="summary-price__price"
                data-testid="cart-delivery-fee"
              >
                {formatOrderTotalThb(orderTotals.deliveryFeeThb)}
              </div>
            </div>
          ) : null}
          <div className="summary-price-item total-row">
            <div className="summary-price__title">Total</div>
            <div className="summary-price__price" data-testid="cart-total">
              {totalLabel}
            </div>
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
              <button
                type="button"
                className="cart-pickup-gate-link"
                onClick={openSelectionForReason}
              >
                Select service, date and time
              </button>
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
              <span className="checkout-total-amount">{totalLabel}</span>
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
