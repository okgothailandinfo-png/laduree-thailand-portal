"use client";

import { usePickup } from "./PickupContext";
import { formatPickupDateKeyLong } from "./pickup-dates";

/** Cart fulfillment strip — Singapore #divPickupMyCart patterns. */
export default function CartFulfillmentStrip() {
  const { confirmed, isPickupComplete, openPickupSelection } = usePickup();
  const serviceType = confirmed?.serviceType ?? "PICKUP";
  const isDelivery = serviceType === "DELIVERY";

  return (
    <>
      <div className="tab-service-main">
        <button
          type="button"
          className={`tab-service-item${
            !isDelivery ? " active" : ""
          }`}
          onClick={() => openPickupSelection({ step: "service" })}
        >
          Pick-up
        </button>
        <button
          type="button"
          className={`tab-service-item${isDelivery ? " active" : ""}`}
          onClick={() => openPickupSelection({ step: "service" })}
        >
          Delivery
        </button>
        <button
          type="button"
          className="tab-service-item tab-service-other"
          title="Select Other Services"
          onClick={() => openPickupSelection({ step: "service" })}
        >
          Select Other Services
        </button>
      </div>

      <div
        id="divPickupMyCart"
        className={`bg-pink cart-fulfillment${isPickupComplete ? "" : " is-empty"}`}
      >
        {isPickupComplete && confirmed ? (
          <>
            <div className="cart-outlet">
              {isDelivery && confirmed.deliveryAddress ? (
                <>
                  <span className="cart-outlet-name">
                    {confirmed.deliveryAddress.recipient}
                  </span>
                  <span className="cart-outlet-address">
                    {confirmed.deliveryAddress.address},{" "}
                    {confirmed.deliveryAddress.subdistrict},{" "}
                    {confirmed.deliveryAddress.district},{" "}
                    {confirmed.deliveryAddress.province}{" "}
                    {confirmed.deliveryAddress.postalCode}
                  </span>
                </>
              ) : (
                <>
                  <span className="cart-outlet-name">
                    {confirmed.boutique.name}
                  </span>
                  <span className="cart-outlet-address">
                    {confirmed.boutique.address}
                  </span>
                </>
              )}
            </div>
            <div className="cart-pickup-time">
              <span className="cart-pickup-label">
                {isDelivery ? "Delivery Time" : "Pickup Time"}
              </span>
              <span className="cart-pickup-values">
                {formatPickupDateKeyLong(confirmed.dateKey)}
                <br />
                {confirmed.timeSlot.start} To {confirmed.timeSlot.end}
              </span>
              <button
                type="button"
                className="cart-pickup-change"
                onClick={() => openPickupSelection({ step: "datetime" })}
              >
                Select a different date/time
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cart-outlet">
              <span className="cart-outlet-name">
                Select service, date and time
              </span>
            </div>
            <div className="cart-pickup-time">
              <span className="cart-pickup-label">Pickup Time</span>
              <span className="cart-pickup-incomplete">
                No pickup date/time selected
              </span>
              <button
                type="button"
                className="cart-pickup-change"
                onClick={() => openPickupSelection({ step: "service" })}
              >
                Select a different date/time
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
