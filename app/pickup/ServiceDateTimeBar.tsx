"use client";

import { usePickup } from "./PickupContext";
import { formatPickupDateKey } from "./pickup-dates";

/** Mobile header strip — Singapore `.select-datetime-service`. */
export default function ServiceDateTimeBar() {
  const { confirmed, isPickupComplete, openPickupSelection } = usePickup();

  return (
    <div className="services-info-block">
      <button
        type="button"
        className={`select-datetime-service${isPickupComplete ? " has-selection" : ""}`}
        title="Select service, date and time"
        aria-haspopup="dialog"
        onClick={() =>
          openPickupSelection({
            step: isPickupComplete ? "datetime" : "service",
          })
        }
      >
        <span className="select-datetime-service__text">
          {isPickupComplete && confirmed ? (
            <>
              <span className="select-datetime-service__summary">
                {confirmed.boutique.name}
              </span>
              <span className="select-datetime-service__summary-meta">
                {formatPickupDateKey(confirmed.dateKey)} ·{" "}
                {confirmed.timeSlot.label}
              </span>
            </>
          ) : (
            <span>Select service, date and time</span>
          )}
        </span>
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="17"
          viewBox="0 0 10 17"
          fill="none"
        >
          <path
            d="M0 2.38L6.10667 8.5L0 14.62L1.88 16.5L9.88 8.5L1.88 0.5L0 2.38Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
