"use client";

import {
  formatReviewFee,
  formatReviewMoney,
  TRUSTED_TAX_PLACEHOLDER,
  type OrderReviewModel,
} from "./order-review-model";

type Props = {
  model: OrderReviewModel;
  /** Optional heading override — default "Order Review". */
  title?: string;
  testId?: string;
  className?: string;
};

export default function OrderReview({
  model,
  title = "Order Review",
  testId = "order-review",
  className,
}: Props) {
  const isDelivery = model.serviceType === "DELIVERY";

  return (
    <section
      className={className ?? "checkout-order-review"}
      aria-labelledby="order-review-title"
      data-testid={testId}
    >
      <h3 id="order-review-title" className="checkout-order-review__title">
        {title}
      </h3>

      <p className="checkout-summary-meta">
        Customer Name: {model.customer.customerName}
        <br />
        Email: {model.customer.email}
        <br />
        Mobile Number: {model.customer.mobileNumber}
      </p>

      {model.pickup ? (
        <p className="checkout-summary-meta">
          Boutique
          <br />
          {model.pickup.boutiqueName}
          <br />
          {model.pickup.boutiqueAddress}
          <br />
          Pickup Date: {model.pickup.dateLabel}
          <br />
          Pickup Time: {model.pickup.timeLabel}
        </p>
      ) : null}

      {model.delivery ? (
        <>
          <p className="checkout-summary-meta">
            Full Delivery Address
            <br />
            {model.delivery.fullAddress}
          </p>
          <p className="checkout-summary-meta">
            Delivery Mode: {model.delivery.modeLabel}
            {model.delivery.dateLabel ? (
              <>
                <br />
                Delivery Date: {model.delivery.dateLabel}
              </>
            ) : null}
            {model.delivery.windowLabel ? (
              <>
                <br />
                Delivery Window: {model.delivery.windowLabel}
              </>
            ) : null}
          </p>
          {model.delivery.notes ? (
            <p className="checkout-summary-meta">
              Delivery Notes: {model.delivery.notes}
            </p>
          ) : null}
        </>
      ) : null}

      <ul className="checkout-summary-list" data-testid="order-review-items">
        {model.items.map((item) => (
          <li key={item.id}>
            <span>
              {item.name}
              {item.modifiersLabel ? ` — ${item.modifiersLabel}` : ""}
            </span>
            <span>× {item.quantity}</span>
          </li>
        ))}
      </ul>

      <div className="checkout-totals" data-testid="order-review-totals">
        <div className="checkout-totals__row">
          <span>Subtotal</span>
          <span data-testid="order-review-subtotal">
            {formatReviewMoney(model.totals.subtotalThb)}
          </span>
        </div>
        {isDelivery && typeof model.totals.deliveryFeeThb === "number" ? (
          <div className="checkout-totals__row">
            <span>Delivery Fee</span>
            <span data-testid="order-review-delivery-fee">
              {formatReviewFee(model.totals.deliveryFeeThb)}
            </span>
          </div>
        ) : null}
        <div className="checkout-totals__row">
          <span>Tax</span>
          <span data-testid="order-review-tax">{model.taxLabel}</span>
        </div>
        <div className="checkout-totals__row total">
          <span>Total</span>
          <span data-testid="order-review-total">
            {formatReviewMoney(model.totals.totalThb)}
          </span>
        </div>
      </div>
    </section>
  );
}

export { TRUSTED_TAX_PLACEHOLDER };
