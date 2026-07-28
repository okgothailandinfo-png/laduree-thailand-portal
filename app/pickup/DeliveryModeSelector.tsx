"use client";

type DeliveryMode = "EARLIEST_AVAILABLE" | "PREORDER";

type DeliveryModeSelectorProps = {
  value: DeliveryMode;
  onChange: (mode: DeliveryMode) => void;
};

/** Delivery mode choices — Earliest Delivery (default) and Pre-order only. */
export default function DeliveryModeSelector({
  value,
  onChange,
}: DeliveryModeSelectorProps) {
  return (
    <div
      className="delivery-mode-selector"
      role="radiogroup"
      aria-label="Select Delivery Option"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "EARLIEST_AVAILABLE"}
        className={`delivery-mode-selector__option${
          value === "EARLIEST_AVAILABLE" ? " is-selected" : ""
        }`}
        onClick={() => onChange("EARLIEST_AVAILABLE")}
      >
        <span className="delivery-mode-selector__title">Earliest Delivery</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "PREORDER"}
        className={`delivery-mode-selector__option${
          value === "PREORDER" ? " is-selected" : ""
        }`}
        onClick={() => onChange("PREORDER")}
      >
        <span className="delivery-mode-selector__title">Pre-order</span>
      </button>
    </div>
  );
}
