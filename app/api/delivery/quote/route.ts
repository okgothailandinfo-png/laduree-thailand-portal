import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  buildDemoQuoteMeta,
  isDeliveryDemoFixtureEnabled,
  resolveDemoEarliestPromise,
} from "@/src/server/delivery/demo-fixture";
import {
  createRuntimeDeliveryAvailabilityEngine,
  createRuntimeDeliveryFeeEngine,
} from "@/src/server/delivery/runtime";
import type { DeliveryFeeQuoteInput } from "@/src/server/models/delivery";
import { AppError } from "@/src/server/utils/errors";
import { requireObject, requireString } from "@/src/server/utils/validation";

export const runtime = "nodejs";

function parseQuoteAddress(raw: unknown): DeliveryFeeQuoteInput["address"] {
  const addressRaw = requireObject(raw, "address");
  const postalCode = requireString(addressRaw.postalCode, "address.postalCode");
  if (!/^\d{5}$/.test(postalCode.trim())) {
    throw new AppError(
      "VALIDATION_ERROR",
      "address.postalCode must be a 5-digit Thai postal code.",
      { details: { field: "address.postalCode" } },
    );
  }
  const optional = (key: string): string | undefined => {
    const value = addressRaw[key];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        `address.${key} must be a string.`,
        { details: { field: `address.${key}` } },
      );
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  return {
    postalCode: postalCode.trim(),
    province: optional("province"),
    district: optional("district"),
    subdistrict: optional("subdistrict"),
    address: optional("address"),
  };
}

/** POST /api/delivery/quote — zone fee + earliest promise + pre-order catalog. */
export async function POST(request: Request) {
  return handleApi(async () => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }
    const body = requireObject(raw, "body");
    const address = parseQuoteAddress(body.address);
    const now = new Date();
    const feeEngine = createRuntimeDeliveryFeeEngine();
    const availabilityEngine = createRuntimeDeliveryAvailabilityEngine(now);

    const quote = feeEngine.quote({ address });
    const zoneSupported = quote.matched && quote.reason !== "ZONE_INACTIVE";
    const basePromise = availabilityEngine.resolveEarliestAvailable(now);
    const promise = isDeliveryDemoFixtureEnabled()
      ? resolveDemoEarliestPromise(address.postalCode, now, basePromise)
      : basePromise;

    const preorderDateKeys = availabilityEngine.listPreorderDateKeys(now);
    const windowByDate: Record<
      string,
      { id: string; label: string; start: string; end: string }
    > = {};
    for (const dateKey of preorderDateKeys) {
      const resolved = availabilityEngine.resolvePreorderWindow(dateKey, now);
      if (resolved.available && resolved.timeWindow) {
        windowByDate[dateKey] = { ...resolved.timeWindow };
      }
    }

    const demoMeta = isDeliveryDemoFixtureEnabled()
      ? buildDemoQuoteMeta(now)
      : null;

    return ok({
      zoneSupported,
      feeTrusted: quote.feeMinor !== null,
      feeThb: quote.feeMinor === null ? null : quote.feeMinor / 100,
      feeMinor: quote.feeMinor,
      feeReason: quote.reason,
      zoneId: quote.zoneId,
      currency: "THB" as const,
      postalCode: address.postalCode,
      deliveryModeDefault: "EARLIEST_AVAILABLE" as const,
      earliestAvailable: {
        available: zoneSupported ? promise.available : false,
        dateKey: zoneSupported ? promise.dateKey : null,
        relativeLabel: zoneSupported ? promise.relativeLabel : null,
        timeWindow: zoneSupported ? promise.timeWindow : null,
        reason: zoneSupported ? promise.reason : "NO_ZONE_MATCH",
      },
      preorderDateKeys: zoneSupported ? preorderDateKeys : [],
      windowByDate: zoneSupported ? windowByDate : {},
      quoteCreatedAt: demoMeta?.quoteCreatedAt ?? now.toISOString(),
      quoteExpiresAt: demoMeta?.quoteExpiresAt ?? null,
      source: demoMeta?.source ?? null,
      /** Internal only — clients must not display this to customers. */
      fulfilmentLocationId: zoneSupported
        ? (quote.boutiqueId ?? demoMeta?.fulfilmentLocationId ?? null)
        : null,
      demoFixtureEnabled: Boolean(demoMeta),
    });
  }, request);
}
