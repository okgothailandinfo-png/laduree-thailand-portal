/**
 * Courier provider interfaces — Sprint 21 foundation.
 * No live API integration yet (GrabExpress, Lalamove, LINE MAN, Flash).
 */

export type CourierProviderId =
  | "grab_express"
  | "lalamove"
  | "line_man"
  | "flash";

export type CourierQuoteRequest = {
  /** Origin / fulfilling boutique label (ops only). */
  pickupLabel: string;
  dropoff: {
    recipient: string;
    phone: string;
    address: string;
    subdistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  /** Optional scheduled window (Asia/Bangkok dateKey + slot label). */
  schedule?: {
    dateKey: string;
    timeSlotLabel: string;
  };
};

export type CourierQuoteResult = {
  providerId: CourierProviderId;
  /** Provider quote id when available. */
  quoteId: string | null;
  /**
   * Quoted fee in satang. Always null until a real provider integration
   * returns an owner-approved amount — never invent.
   */
  feeMinor: number | null;
  currency: "THB";
  /** Human-readable status for ops / future UI. */
  status: "UNSUPPORTED" | "QUOTED" | "UNAVAILABLE";
  message: string;
};

export type CourierCreateDeliveryRequest = CourierQuoteRequest & {
  orderId: string;
  orderNumber: string;
  /** Optional prior quote id from quoteDelivery. */
  quoteId?: string | null;
};

export type CourierCreateDeliveryResult = {
  providerId: CourierProviderId;
  externalDeliveryId: string | null;
  status: "UNSUPPORTED" | "CREATED" | "FAILED";
  message: string;
};

export type CourierDeliveryStatus =
  | "UNSUPPORTED"
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export type CourierStatusResult = {
  providerId: CourierProviderId;
  externalDeliveryId: string;
  status: CourierDeliveryStatus;
  message: string;
};

/**
 * Courier / last-mile provider contract.
 * Implementations in this sprint are stubs — prepare for future API wiring.
 */
export interface CourierProvider {
  readonly id: CourierProviderId;
  readonly displayName: string;
  quoteDelivery(input: CourierQuoteRequest): Promise<CourierQuoteResult>;
  createDelivery(
    input: CourierCreateDeliveryRequest,
  ): Promise<CourierCreateDeliveryResult>;
  getDeliveryStatus(externalDeliveryId: string): Promise<CourierStatusResult>;
  cancelDelivery(externalDeliveryId: string): Promise<CourierStatusResult>;
}

export function createUnsupportedQuote(
  providerId: CourierProviderId,
  message: string,
): CourierQuoteResult {
  return {
    providerId,
    quoteId: null,
    feeMinor: null,
    currency: "THB",
    status: "UNSUPPORTED",
    message,
  };
}

export function createUnsupportedDelivery(
  providerId: CourierProviderId,
  message: string,
): CourierCreateDeliveryResult {
  return {
    providerId,
    externalDeliveryId: null,
    status: "UNSUPPORTED",
    message,
  };
}

export function createUnsupportedStatus(
  providerId: CourierProviderId,
  externalDeliveryId: string,
  message: string,
): CourierStatusResult {
  return {
    providerId,
    externalDeliveryId,
    status: "UNSUPPORTED",
    message,
  };
}
