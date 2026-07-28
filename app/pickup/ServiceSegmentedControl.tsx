"use client";

import type { FulfillmentServiceType } from "./pickup-availability";

type ServiceSegmentedControlProps = {
  value: FulfillmentServiceType;
  onChange: (serviceType: FulfillmentServiceType) => void;
};

/** Full-width Pick-up | Delivery segmented control — SG nav-tabs pattern. */
export default function ServiceSegmentedControl({
  value,
  onChange,
}: ServiceSegmentedControlProps) {
  return (
    <div
      className="service-segmented"
      role="tablist"
      aria-label="Select your desired service"
    >
      <button
        type="button"
        role="tab"
        id="service-tab-pickup"
        aria-selected={value === "PICKUP"}
        aria-controls="service-panel-pickup"
        tabIndex={value === "PICKUP" ? 0 : -1}
        className={`service-segmented__tab service-segmented__tab--left${
          value === "PICKUP" ? " is-active" : ""
        }`}
        onClick={() => onChange("PICKUP")}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            onChange("DELIVERY");
            queueMicrotask(() => {
              document.getElementById("service-tab-delivery")?.focus();
            });
          }
        }}
      >
        Pick-up
      </button>
      <button
        type="button"
        role="tab"
        id="service-tab-delivery"
        aria-selected={value === "DELIVERY"}
        aria-controls="service-panel-delivery"
        tabIndex={value === "DELIVERY" ? 0 : -1}
        className={`service-segmented__tab service-segmented__tab--right${
          value === "DELIVERY" ? " is-active" : ""
        }`}
        onClick={() => onChange("DELIVERY")}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            onChange("PICKUP");
            queueMicrotask(() => {
              document.getElementById("service-tab-pickup")?.focus();
            });
          }
        }}
      >
        Delivery
      </button>
    </div>
  );
}
