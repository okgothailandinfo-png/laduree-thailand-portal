import type {
  DeliveryAvailabilityRule,
  DeliveryPreorderConfig,
  DeliveryPreorderResolution,
  DeliveryPromise,
  DeliveryTimeWindow,
} from "@/src/server/models/delivery";

const BANGKOK = "Asia/Bangkok";

function bangkokParts(now: Date): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { dateKey, hour, minute };
}

function parseCutoff(cutoff: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(cutoff.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function addDaysToDateKey(dateKey: string, days: number): string | null {
  // Interpret dateKey as a Bangkok calendar day via fixed +07:00 offset.
  const base = new Date(`${dateKey}T12:00:00.000+07:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return bangkokParts(base).dateKey;
}

function cloneWindow(
  window: DeliveryTimeWindow | null | undefined,
): DeliveryTimeWindow | null {
  if (!window) return null;
  return {
    id: window.id,
    label: window.label,
    start: window.start,
    end: window.end,
  };
}

export interface DeliveryAvailabilityEngine {
  resolveEarliestAvailable(now?: Date): DeliveryPromise;
  /** Future date keys only (excludes today and past). */
  listPreorderDateKeys(now?: Date): string[];
  resolvePreorderWindow(
    dateKey: string,
    now?: Date,
  ): DeliveryPreorderResolution;
}

/**
 * EARLIEST_AVAILABLE / PREORDER availability.
 * Default empty rules → unavailable (never invent cut-offs, dates, or windows).
 */
export class ConfigurableDeliveryAvailabilityEngine
  implements DeliveryAvailabilityEngine
{
  constructor(
    private readonly rules: readonly DeliveryAvailabilityRule[] = [],
    private readonly preorder: DeliveryPreorderConfig = {
      windowByDateKey: new Map(),
    },
  ) {}

  resolveEarliestAvailable(now: Date = new Date()): DeliveryPromise {
    const active = this.rules.find((rule) => rule.isActive);
    if (!active) {
      if (this.rules.length === 0) {
        return {
          available: false,
          dateKey: null,
          relativeLabel: null,
          timeWindow: null,
          reason: "NO_RULE",
        };
      }
      return {
        available: false,
        dateKey: null,
        relativeLabel: null,
        timeWindow: null,
        reason: "RULE_INACTIVE",
      };
    }

    if (!active.sameDayCutoffTime) {
      return {
        available: false,
        dateKey: null,
        relativeLabel: null,
        timeWindow: null,
        reason: "CUTOFF_PENDING",
      };
    }

    const cutoff = parseCutoff(active.sameDayCutoffTime);
    if (!cutoff) {
      return {
        available: false,
        dateKey: null,
        relativeLabel: null,
        timeWindow: null,
        reason: "CUTOFF_PENDING",
      };
    }

    const window = cloneWindow(active.earliestTimeWindow);
    if (!window) {
      return {
        available: false,
        dateKey: null,
        relativeLabel: null,
        timeWindow: null,
        reason: "WINDOW_PENDING",
      };
    }

    const { dateKey, hour, minute } = bangkokParts(now);
    const minutesNow = hour * 60 + minute;
    const minutesCutoff = cutoff.hour * 60 + cutoff.minute;
    const beforeCutoff = minutesNow < minutesCutoff;

    if (beforeCutoff) {
      return {
        available: true,
        dateKey,
        relativeLabel: "Today",
        timeWindow: window,
        reason: "SAME_DAY",
      };
    }

    if (active.nextDayEnabled) {
      const nextKey = addDaysToDateKey(dateKey, 1);
      if (!nextKey) {
        return {
          available: false,
          dateKey: null,
          relativeLabel: null,
          timeWindow: null,
          reason: "CUTOFF_PENDING",
        };
      }
      return {
        available: true,
        dateKey: nextKey,
        relativeLabel: "Tomorrow",
        timeWindow: window,
        // Internal calculation reason — not a customer-facing delivery mode.
        reason: "NEXT_DAY",
      };
    }

    return {
      available: false,
      dateKey: null,
      relativeLabel: null,
      timeWindow: null,
      reason: "CUTOFF_PENDING",
    };
  }

  listPreorderDateKeys(now: Date = new Date()): string[] {
    const today = bangkokParts(now).dateKey;
    return [...this.preorder.windowByDateKey.keys()]
      .filter((dateKey) => dateKey > today)
      .sort();
  }

  resolvePreorderWindow(
    dateKey: string,
    now: Date = new Date(),
  ): DeliveryPreorderResolution {
    if (this.preorder.windowByDateKey.size === 0) {
      return {
        available: false,
        dateKey: null,
        timeWindow: null,
        reason: "NO_CATALOG",
      };
    }

    const today = bangkokParts(now).dateKey;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || dateKey <= today) {
      return {
        available: false,
        dateKey: null,
        timeWindow: null,
        reason: "TODAY_OR_PAST",
      };
    }

    const window = cloneWindow(this.preorder.windowByDateKey.get(dateKey));
    if (!window) {
      return {
        available: false,
        dateKey: null,
        timeWindow: null,
        reason: "DATE_NOT_AVAILABLE",
      };
    }

    return {
      available: true,
      dateKey,
      timeWindow: window,
      reason: "OK",
    };
  }
}

/** Default: no approved cut-off / windows — EARLIEST_AVAILABLE and PREORDER stay unavailable. */
export const DEFAULT_DELIVERY_AVAILABILITY_RULES: readonly DeliveryAvailabilityRule[] =
  [];

export function createDeliveryAvailabilityEngine(
  rules: readonly DeliveryAvailabilityRule[] = DEFAULT_DELIVERY_AVAILABILITY_RULES,
  preorder?: DeliveryPreorderConfig,
): DeliveryAvailabilityEngine {
  return new ConfigurableDeliveryAvailabilityEngine(rules, preorder);
}

/** @deprecated Use resolveEarliestAvailable — kept for transitional call sites during rename. */
export type { DeliveryTimeWindow };
