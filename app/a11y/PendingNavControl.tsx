"use client";

import { uiChrome } from "@/lib/i18n/ui-chrome";

type PendingNavControlProps = {
  label: string;
  className?: string;
  /** When true, wrap label in a span (mobile menu style). */
  wrapLabel?: boolean;
};

/**
 * Visible SG-parity nav label that is not yet navigable.
 * Uses a disabled button so keyboard users are not offered a dead link.
 */
export default function PendingNavControl({
  label,
  className = "",
  wrapLabel = false,
}: PendingNavControlProps) {
  return (
    <button
      type="button"
      className={`nav-pending ${className}`.trim()}
      disabled
      aria-disabled="true"
      title={uiChrome("navPendingTitle")}
    >
      {wrapLabel ? <span>{label}</span> : label}
    </button>
  );
}
