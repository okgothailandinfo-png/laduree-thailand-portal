import { apiMutate } from "@/lib/api/client";

export type DeliveryQuoteRequest = {
  address: {
    postalCode: string;
    province?: string;
    district?: string;
    subdistrict?: string;
    address?: string;
  };
};

export type DeliveryTimeWindowDto = {
  id: string;
  label: string;
  start: string;
  end: string;
};

export type DeliveryQuoteResponse = {
  zoneSupported: boolean;
  feeTrusted: boolean;
  feeThb: number | null;
  feeMinor: number | null;
  feeReason: string;
  zoneId: string | null;
  currency: "THB";
  postalCode: string;
  deliveryModeDefault: "EARLIEST_AVAILABLE";
  earliestAvailable: {
    available: boolean;
    dateKey: string | null;
    relativeLabel: "Today" | "Tomorrow" | null;
    timeWindow: DeliveryTimeWindowDto | null;
    reason: string;
  };
  preorderDateKeys: string[];
  windowByDate: Record<string, DeliveryTimeWindowDto>;
  quoteCreatedAt: string;
  quoteExpiresAt: string | null;
  source: "DEMO_DEVELOPMENT_ONLY" | null;
  /** Internal only — do not display to customers. */
  fulfilmentLocationId: string | null;
  demoFixtureEnabled: boolean;
};

export async function fetchDeliveryQuote(
  input: DeliveryQuoteRequest,
  options?: { signal?: AbortSignal },
): Promise<DeliveryQuoteResponse> {
  return apiMutate<DeliveryQuoteResponse>(
    "/api/delivery/quote",
    "POST",
    input,
    { signal: options?.signal },
  );
}
