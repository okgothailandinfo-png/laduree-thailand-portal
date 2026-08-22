/**
 * DEVELOPMENT / TEST ONLY — Delivery demo fixture.
 *
 * Never loaded when APP_ENV=production.
 * Values are intentionally fake and labeled for local E2E testing.
 * Do not treat these as owner-approved Thailand production configuration.
 */

import type {
  DeliveryAvailabilityRule,
  DeliveryPreorderConfig,
  DeliveryPromise,
  DeliveryTimeWindow,
  DeliveryZone,
} from "@/src/server/models/delivery";

export const DEMO_DELIVERY_SOURCE = "DEMO_DEVELOPMENT_ONLY" as const;

/** Internal only — never render to customers. */
export const DEMO_FULFILMENT_LOCATION_ID = "demo-fulfilment-internal-01";

/** DEVELOPMENT-ONLY TEST VALUES — supported earliest postal. */
export const DEMO_POSTAL_EARLIEST = "10110";

/** DEVELOPMENT-ONLY TEST VALUES — supported later-date postal. */
export const DEMO_POSTAL_LATER = "10500";

/**
 * DEVELOPMENT-ONLY TEST VALUES — known unsupported postal for negative tests.
 * Any other unmatched postal also returns unsupported.
 */
export const DEMO_POSTAL_UNSUPPORTED = "00000";

/** Trusted mock fee (satang). ฿99.00 — DEMO ONLY. */
export const DEMO_DELIVERY_FEE_MINOR = 9900;

/** Quote TTL for stale-quote checkout rejection (seconds). */
export const DEMO_QUOTE_TTL_SECONDS = 15 * 60;

export const DEMO_TIME_WINDOW: DeliveryTimeWindow = {
  id: "demo-window-1230-1530",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

const BANGKOK = "Asia/Bangkok";

function bangkokDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00.000+07:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return bangkokDateKey(base);
}

/**
 * Demo fixture is enabled only outside production.
 * Opt out with DELIVERY_DEMO=0. Opt in explicitly with DELIVERY_DEMO=1
 * (useful when APP_ENV=staging and mock providers are allowed).
 */
export function isDeliveryDemoFixtureEnabled(env: {
  appEnv?: string | null;
  nodeEnv?: string | null;
  deliveryDemo?: string | null;
} = {}): boolean {
  const appEnv = (env.appEnv ?? process.env.APP_ENV ?? "").trim().toLowerCase();
  const nodeEnv = (
    env.nodeEnv ??
    process.env.NODE_ENV ??
    "development"
  )
    .trim()
    .toLowerCase();
  const flag = (
    env.deliveryDemo ??
    process.env.DELIVERY_DEMO ??
    ""
  )
    .trim()
    .toLowerCase();

  if (appEnv === "production" || appEnv === "preview") return false;
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") {
    return appEnv !== "production";
  }
  // Default: on for development and test node/app envs.
  return (
    nodeEnv === "development" ||
    nodeEnv === "test" ||
    appEnv === "development" ||
    appEnv === "test"
  );
}

/** DEMO zones — flat fees approved only for development testing. */
export const DEMO_DELIVERY_ZONES: readonly DeliveryZone[] = [
  {
    id: "demo-zone-earliest",
    name: "[DEMO] Earliest zone",
    postalCodes: [DEMO_POSTAL_EARLIEST],
    provinces: [],
    districts: [],
    boutiqueId: DEMO_FULFILMENT_LOCATION_ID,
    strategy: "FLAT_RATE",
    flatRateMinor: DEMO_DELIVERY_FEE_MINOR,
    isActive: true,
  },
  {
    id: "demo-zone-later",
    name: "[DEMO] Later-date zone",
    postalCodes: [DEMO_POSTAL_LATER],
    provinces: [],
    districts: [],
    boutiqueId: DEMO_FULFILMENT_LOCATION_ID,
    strategy: "FLAT_RATE",
    flatRateMinor: DEMO_DELIVERY_FEE_MINOR,
    isActive: true,
  },
];

/**
 * Demo earliest rule: same-day before 22:00 Asia/Bangkok, else next calendar day.
 * Used for DEMO_POSTAL_EARLIEST. Later postal uses a fixed offset instead.
 */
export const DEMO_EARLIEST_AVAILABILITY_RULES: readonly DeliveryAvailabilityRule[] =
  [
    {
      id: "demo-rule-earliest",
      sameDayCutoffTime: "22:00",
      nextDayEnabled: true,
      earliestTimeWindow: DEMO_TIME_WINDOW,
      isActive: true,
    },
  ];

/** Number of future Pre-order dates (today+1 … today+N). */
export const DEMO_PREORDER_FUTURE_DAY_COUNT = 5;

export function buildDemoPreorderConfig(
  now: Date = new Date(),
): DeliveryPreorderConfig {
  const today = bangkokDateKey(now);
  const windowByDateKey = new Map<string, DeliveryTimeWindow>();
  for (let i = 1; i <= DEMO_PREORDER_FUTURE_DAY_COUNT; i += 1) {
    const dateKey = addDaysToDateKey(today, i);
    windowByDateKey.set(dateKey, { ...DEMO_TIME_WINDOW });
  }
  return { windowByDateKey };
}

/**
 * Postal-aware earliest promise for the demo fixture.
 * - 10110: same-day / next-day from cut-off rule
 * - 10500: fixed later date (today + 2)
 * - other: unavailable (caller should already have zone match)
 */
export function resolveDemoEarliestPromise(
  postalCode: string,
  now: Date = new Date(),
  basePromise?: DeliveryPromise,
): DeliveryPromise {
  const postal = postalCode.trim();
  if (postal === DEMO_POSTAL_LATER) {
    const today = bangkokDateKey(now);
    const dateKey = addDaysToDateKey(today, 2);
    return {
      available: true,
      dateKey,
      relativeLabel: null,
      timeWindow: { ...DEMO_TIME_WINDOW },
      reason: "LATER_DATE",
    };
  }
  if (postal === DEMO_POSTAL_EARLIEST && basePromise) {
    return basePromise;
  }
  if (basePromise) return basePromise;
  return {
    available: false,
    dateKey: null,
    relativeLabel: null,
    timeWindow: null,
    reason: "NO_RULE",
  };
}

export function buildDemoQuoteMeta(now: Date = new Date()): {
  source: typeof DEMO_DELIVERY_SOURCE;
  currency: "THB";
  quoteCreatedAt: string;
  quoteExpiresAt: string;
  fulfilmentLocationId: string;
} {
  const created = now.getTime();
  return {
    source: DEMO_DELIVERY_SOURCE,
    currency: "THB",
    quoteCreatedAt: new Date(created).toISOString(),
    quoteExpiresAt: new Date(
      created + DEMO_QUOTE_TTL_SECONDS * 1000,
    ).toISOString(),
    fulfilmentLocationId: DEMO_FULFILMENT_LOCATION_ID,
  };
}

/** Human-readable DEVELOPMENT-ONLY test inputs for manual QA reports. */
export const DEMO_DELIVERY_TEST_INPUTS = {
  label: "DEVELOPMENT-ONLY TEST VALUES",
  postalEarliest: DEMO_POSTAL_EARLIEST,
  postalLater: DEMO_POSTAL_LATER,
  postalUnsupported: DEMO_POSTAL_UNSUPPORTED,
  feeThb: DEMO_DELIVERY_FEE_MINOR / 100,
  timeWindowLabel: DEMO_TIME_WINDOW.label,
  preorderRule: `Asia/Bangkok today+1 through today+${DEMO_PREORDER_FUTURE_DAY_COUNT}`,
} as const;
