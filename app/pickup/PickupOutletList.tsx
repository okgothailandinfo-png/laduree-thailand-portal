"use client";

import type { Boutique } from "@/lib/api/types";
import CatalogStatus from "../catalog/CatalogStatus";

type PickupOutletListProps = {
  boutiques: Boutique[];
  selectedId: string | null;
  onSelect: (boutiqueId: string) => void;
  status: "loading" | "success" | "error" | "empty";
  errorMessage: string | null;
  onRetry: () => void;
};

/** Outlet cards for Pickup — uses existing Thailand/mock boutique data only. */
export default function PickupOutletList({
  boutiques,
  selectedId,
  onSelect,
  status,
  errorMessage,
  onRetry,
}: PickupOutletListProps) {
  if (status === "loading" || status === "error" || status === "empty") {
    return (
      <CatalogStatus
        status={status}
        errorMessage={errorMessage}
        emptyMessage="No boutiques available."
        onRetry={onRetry}
      />
    );
  }

  return (
    <ul className="pickup-outlet-list" role="list">
      {boutiques.map((boutique, index) => {
        const selected = selectedId === boutique.id;
        return (
          <li key={boutique.id}>
            <button
              type="button"
              className={`pickup-outlet-card${selected ? " is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onSelect(boutique.id)}
            >
              <span className="pickup-outlet-card__icon" aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14 3.5C9.30558 3.5 5.5 7.30558 5.5 12C5.5 17.25 14 24.5 14 24.5C14 24.5 22.5 17.25 22.5 12C22.5 7.30558 18.6944 3.5 14 3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle
                    cx="14"
                    cy="12"
                    r="2.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </span>
              <span className="pickup-outlet-card__body">
                <span className="pickup-outlet-card__name">
                  {index + 1}. {boutique.name}
                </span>
                <span className="pickup-outlet-card__address">
                  {boutique.address}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
