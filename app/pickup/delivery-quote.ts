/**
 * Authoritative Delivery Quote lifecycle — single source of truth for
 * cart, checkout eligibility, and checkout/payment display.
 */

export type DeliveryQuoteStatus =
  | "EMPTY"
  | "PENDING"
  | "VALID"
  | "INVALID"
  | "EXPIRED"
  | "UNSUPPORTED";

export type DeliveryQuoteWindow = {
  id: string;
  label: string;
  start: string;
  end: string;
};

export type DeliveryQuote = {
  quoteId: string | null;
  postalCode: string;
  zoneId: string | null;
  deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER";
  deliveryDate: string | null;
  deliveryWindow: DeliveryQuoteWindow | null;
  /** Relative label for earliest (Today / Tomorrow) — display only. */
  relativeLabel: "Today" | "Tomorrow" | null;
  deliveryFee: number | null;
  status: DeliveryQuoteStatus;
  expiresAt: string | null;
  trusted: boolean;
  createdAt: string | null;
};

export function emptyDeliveryQuote(
  patch: Partial<
    Pick<DeliveryQuote, "postalCode" | "deliveryMode" | "status">
  > = {},
): DeliveryQuote {
  return {
    quoteId: null,
    postalCode: patch.postalCode ?? "",
    zoneId: null,
    deliveryMode: patch.deliveryMode ?? "EARLIEST_AVAILABLE",
    deliveryDate: null,
    deliveryWindow: null,
    relativeLabel: null,
    deliveryFee: null,
    status: patch.status ?? "EMPTY",
    expiresAt: null,
    trusted: false,
    createdAt: null,
  };
}

/** Postal change / cart change / mode change — clear all displayable quote fields. */
export function invalidateDeliveryQuoteState(
  previous: DeliveryQuote,
  nextPostalCode?: string,
): DeliveryQuote {
  return {
    quoteId: null,
    postalCode:
      typeof nextPostalCode === "string"
        ? nextPostalCode
        : previous.postalCode,
    zoneId: null,
    deliveryMode: previous.deliveryMode,
    deliveryDate: null,
    deliveryWindow: null,
    relativeLabel: null,
    deliveryFee: null,
    status: "INVALID",
    expiresAt: null,
    trusted: false,
    createdAt: null,
  };
}

export function markDeliveryQuoteUnsupported(
  previous: DeliveryQuote,
  postalCode: string,
  meta?: { createdAt?: string | null; expiresAt?: string | null; zoneId?: string | null },
): DeliveryQuote {
  return {
    ...emptyDeliveryQuote({
      postalCode,
      deliveryMode: previous.deliveryMode,
      status: "UNSUPPORTED",
    }),
    zoneId: meta?.zoneId ?? null,
    createdAt: meta?.createdAt ?? null,
    expiresAt: meta?.expiresAt ?? null,
  };
}

export function markDeliveryQuotePending(
  previous: DeliveryQuote,
  postalCode: string,
): DeliveryQuote {
  return {
    ...invalidateDeliveryQuoteState(previous, postalCode),
    status: "PENDING",
  };
}

export function isDeliveryQuoteExpired(
  quote: DeliveryQuote,
  now: number = Date.now(),
): boolean {
  if (!quote.expiresAt) return false;
  const expires = Date.parse(quote.expiresAt);
  return Number.isFinite(expires) && expires <= now;
}

/**
 * Resolve live status — EXPIRED overrides VALID when past expiresAt.
 * Checkout eligibility must use this, not raw status alone.
 */
export function resolveDeliveryQuoteStatus(
  quote: DeliveryQuote,
  now: number = Date.now(),
): DeliveryQuoteStatus {
  if (quote.status === "VALID" && isDeliveryQuoteExpired(quote, now)) {
    return "EXPIRED";
  }
  return quote.status;
}

/** Checkout / fulfillment completeness — ONLY status VALID (after expiry check). */
export function isDeliveryQuoteValidForCheckout(
  quote: DeliveryQuote | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!quote) return false;
  if (resolveDeliveryQuoteStatus(quote, now) !== "VALID") return false;
  if (!quote.trusted) return false;
  if (!quote.deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(quote.deliveryDate)) {
    return false;
  }
  if (!quote.deliveryWindow?.id) return false;
  if (typeof quote.deliveryFee !== "number") return false;
  return true;
}

export function createValidDeliveryQuote(input: {
  quoteId?: string | null;
  postalCode: string;
  zoneId: string | null;
  deliveryMode: "EARLIEST_AVAILABLE" | "PREORDER";
  deliveryDate: string;
  deliveryWindow: DeliveryQuoteWindow;
  relativeLabel?: "Today" | "Tomorrow" | null;
  deliveryFee: number;
  expiresAt: string | null;
  createdAt: string | null;
}): DeliveryQuote {
  return {
    quoteId: input.quoteId ?? `dq-${input.postalCode}-${input.deliveryDate}-${Date.now()}`,
    postalCode: input.postalCode,
    zoneId: input.zoneId,
    deliveryMode: input.deliveryMode,
    deliveryDate: input.deliveryDate,
    deliveryWindow: input.deliveryWindow,
    relativeLabel: input.relativeLabel ?? null,
    deliveryFee: input.deliveryFee,
    status: "VALID",
    expiresAt: input.expiresAt,
    trusted: true,
    createdAt: input.createdAt,
  };
}

/**
 * PREORDER after zone/fee check but before date selection — not checkout-ready.
 * Fee/zone known; date/window cleared until Confirm date.
 */
export function createPendingPreorderQuote(input: {
  postalCode: string;
  zoneId: string | null;
  deliveryFee: number;
  expiresAt: string | null;
  createdAt: string | null;
}): DeliveryQuote {
  return {
    quoteId: null,
    postalCode: input.postalCode,
    zoneId: input.zoneId,
    deliveryMode: "PREORDER",
    deliveryDate: null,
    deliveryWindow: null,
    relativeLabel: null,
    deliveryFee: input.deliveryFee,
    status: "PENDING",
    expiresAt: input.expiresAt,
    trusted: false,
    createdAt: input.createdAt,
  };
}

export function parsePersistedDeliveryQuote(
  raw: unknown,
  fallbackMode: "EARLIEST_AVAILABLE" | "PREORDER" = "EARLIEST_AVAILABLE",
): DeliveryQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<DeliveryQuote>;
  const status = value.status;
  if (
    status !== "EMPTY" &&
    status !== "PENDING" &&
    status !== "VALID" &&
    status !== "INVALID" &&
    status !== "EXPIRED" &&
    status !== "UNSUPPORTED"
  ) {
    return null;
  }
  const window =
    value.deliveryWindow &&
    typeof value.deliveryWindow === "object" &&
    typeof value.deliveryWindow.id === "string"
      ? {
          id: value.deliveryWindow.id,
          label:
            typeof value.deliveryWindow.label === "string"
              ? value.deliveryWindow.label
              : "",
          start:
            typeof value.deliveryWindow.start === "string"
              ? value.deliveryWindow.start
              : "",
          end:
            typeof value.deliveryWindow.end === "string"
              ? value.deliveryWindow.end
              : "",
        }
      : null;

  const quote: DeliveryQuote = {
    quoteId: typeof value.quoteId === "string" ? value.quoteId : null,
    postalCode: typeof value.postalCode === "string" ? value.postalCode : "",
    zoneId: typeof value.zoneId === "string" ? value.zoneId : null,
    deliveryMode:
      value.deliveryMode === "PREORDER" ? "PREORDER" : fallbackMode,
    deliveryDate:
      typeof value.deliveryDate === "string" ? value.deliveryDate : null,
    deliveryWindow: window,
    relativeLabel:
      value.relativeLabel === "Today" || value.relativeLabel === "Tomorrow"
        ? value.relativeLabel
        : null,
    deliveryFee:
      typeof value.deliveryFee === "number" ? value.deliveryFee : null,
    status,
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : null,
    trusted: value.trusted === true,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : null,
  };

  if (resolveDeliveryQuoteStatus(quote) === "EXPIRED") {
    return { ...invalidateDeliveryQuoteState(quote), status: "EXPIRED" };
  }
  return quote;
}
