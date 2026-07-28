import {
  createUnsupportedDelivery,
  createUnsupportedQuote,
  createUnsupportedStatus,
  type CourierCreateDeliveryRequest,
  type CourierCreateDeliveryResult,
  type CourierProvider,
  type CourierProviderId,
  type CourierQuoteRequest,
  type CourierQuoteResult,
  type CourierStatusResult,
} from "@/src/server/delivery/courier/interfaces";

function stubProvider(
  id: CourierProviderId,
  displayName: string,
): CourierProvider {
  const message = `${displayName} API integration is not configured yet.`;
  return {
    id,
    displayName,
    async quoteDelivery(_input: CourierQuoteRequest): Promise<CourierQuoteResult> {
      return createUnsupportedQuote(id, message);
    },
    async createDelivery(
      _input: CourierCreateDeliveryRequest,
    ): Promise<CourierCreateDeliveryResult> {
      return createUnsupportedDelivery(id, message);
    },
    async getDeliveryStatus(
      externalDeliveryId: string,
    ): Promise<CourierStatusResult> {
      return createUnsupportedStatus(id, externalDeliveryId, message);
    },
    async cancelDelivery(
      externalDeliveryId: string,
    ): Promise<CourierStatusResult> {
      return createUnsupportedStatus(id, externalDeliveryId, message);
    },
  };
}

/** GrabExpress — interface stub only (no API calls). */
export const grabExpressProvider: CourierProvider = stubProvider(
  "grab_express",
  "GrabExpress",
);

/** Lalamove — interface stub only (no API calls). */
export const lalamoveProvider: CourierProvider = stubProvider(
  "lalamove",
  "Lalamove",
);

/** LINE MAN — interface stub only (no API calls). */
export const lineManProvider: CourierProvider = stubProvider(
  "line_man",
  "LINE MAN",
);

/** Flash Express — interface stub only (no API calls). */
export const flashProvider: CourierProvider = stubProvider("flash", "Flash");

const PROVIDERS: Record<CourierProviderId, CourierProvider> = {
  grab_express: grabExpressProvider,
  lalamove: lalamoveProvider,
  line_man: lineManProvider,
  flash: flashProvider,
};

export function getCourierProvider(id: CourierProviderId): CourierProvider {
  return PROVIDERS[id];
}

export function listCourierProviders(): readonly CourierProvider[] {
  return [
    grabExpressProvider,
    lalamoveProvider,
    lineManProvider,
    flashProvider,
  ];
}
