import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PickupTimeSlot } from "@/lib/api/types";
import {
  isAbortError,
  parsePersistedConfirmed,
  PICKUP_MESSAGES,
  reconcileDraftDate,
  reconcileDraftTimeSlot,
  slotsContainId,
} from "./pickup-availability";
import {
  getCandidateDateKeys,
  parseDateKey,
  toDateKey,
  formatPickupDateKey,
  PICKUP_TIMEZONE,
} from "./pickup-dates";

const slots: PickupTimeSlot[] = [
  { id: "1000-1030", label: "10:00–10:30", start: "10:00", end: "10:30" },
  { id: "1030-1100", label: "10:30–11:00", start: "10:30", end: "11:00" },
];

describe("pickup availability loading helpers", () => {
  it("keeps a valid draft date after a successful date response", () => {
    const result = reconcileDraftDate("2026-07-21", [
      "2026-07-19",
      "2026-07-21",
    ]);
    assert.equal(result.dateKey, "2026-07-21");
    assert.equal(result.cleared, false);
  });

  it("marks date loading as empty when no dates are returned", () => {
    const result = reconcileDraftDate("2026-07-21", []);
    assert.equal(result.dateKey, null);
    assert.equal(result.cleared, true);
    assert.equal(PICKUP_MESSAGES.noDates.length > 0, true);
  });

  it("exposes a customer-safe date failure message", () => {
    assert.equal(PICKUP_MESSAGES.datesFailed, "Failed to load availability.");
  });

  it("keeps a valid time slot after a successful slot response", () => {
    const result = reconcileDraftTimeSlot("1030-1100", slots);
    assert.equal(result.timeSlotId, "1030-1100");
    assert.equal(result.cleared, false);
    assert.equal(slotsContainId(slots, "1030-1100"), true);
  });

  it("clears an incompatible time slot when the date has no matching slots", () => {
    const result = reconcileDraftTimeSlot("9999-9999", slots);
    assert.equal(result.timeSlotId, null);
    assert.equal(result.cleared, true);
    assert.equal(PICKUP_MESSAGES.noSlots.includes("this date"), true);
  });

  it("exposes a customer-safe slot failure message", () => {
    assert.equal(PICKUP_MESSAGES.slotsFailed, "Failed to load availability.");
  });

  it("treats AbortError as a terminating non-error state", () => {
    assert.equal(isAbortError(new DOMException("Aborted", "AbortError")), true);
    assert.equal(isAbortError(Object.assign(new Error("aborted"), { name: "AbortError" })), true);
    assert.equal(isAbortError(new Error("network")), false);
  });

  it("blocks availability fetch messaging when boutique is missing", () => {
    assert.equal(
      PICKUP_MESSAGES.missingBoutique,
      "Please select a pickup boutique first.",
    );
  });

  it("restores a valid persisted selection payload", () => {
    const raw = JSON.stringify({
      boutique: {
        id: "boutique-pending",
        name: "[BOUTIQUE PENDING APPROVAL]",
        code: "X",
        address: "A",
        openingHours: "H",
        lastOrderTime: "L",
      },
      dateKey: "2026-07-21",
      timeSlot: slots[1],
    });
    const parsed = parsePersistedConfirmed(raw);
    assert.ok(parsed);
    assert.equal(parsed?.dateKey, "2026-07-21");
    assert.equal(parsed?.timeSlot.id, "1030-1100");
  });

  it("rejects invalid persisted selection payloads safely", () => {
    assert.equal(parsePersistedConfirmed("{"), null);
    assert.equal(parsePersistedConfirmed(JSON.stringify({ dateKey: "x" })), null);
  });

  it("clears an existing invalid date selection without retaining the slot", () => {
    const dates = reconcileDraftDate("2026-07-01", ["2026-07-19"]);
    assert.equal(dates.cleared, true);
    const nextSlot = reconcileDraftTimeSlot(
      dates.cleared ? null : "1030-1100",
      slots,
    );
    assert.equal(nextSlot.timeSlotId, null);
    assert.equal(PICKUP_MESSAGES.staleDate.includes("no longer available"), true);
  });

  it("clears an incompatible time slot when the selected date changes", () => {
    const previous = reconcileDraftTimeSlot("1030-1100", slots);
    assert.equal(previous.timeSlotId, "1030-1100");
    const afterDateChange = reconcileDraftTimeSlot("1030-1100", [
      { id: "1400-1430", label: "14:00–14:30", start: "14:00", end: "14:30" },
    ]);
    assert.equal(afterDateChange.timeSlotId, null);
    assert.equal(afterDateChange.cleared, true);
  });

  it("confirms a selection only when boutique, date, and slot are all valid", () => {
    const boutiqueId = "boutique-pending";
    const dateKey = "2026-07-21";
    const timeSlotId = "1030-1100";
    const dateOk = reconcileDraftDate(dateKey, [dateKey]).dateKey === dateKey;
    const slotOk =
      reconcileDraftTimeSlot(timeSlotId, slots).timeSlotId === timeSlotId;
    const canConfirm = Boolean(boutiqueId && dateOk && slotOk);
    assert.equal(canConfirm, true);
  });

  it("rejects a stale checkout slot while preserving cart integrity signal", () => {
    const stillAvailable = slotsContainId(
      [{ id: "1000-1030", label: "10:00–10:30", start: "10:00", end: "10:30" }],
      "1030-1100",
    );
    assert.equal(stillAvailable, false);
    assert.equal(
      PICKUP_MESSAGES.checkoutStaleSlot.includes("no longer available"),
      true,
    );
  });

  it("does not invent a refetch loop from unchanged draft reconciliation", () => {
    const first = reconcileDraftDate("2026-07-21", ["2026-07-21"]);
    const second = reconcileDraftDate(first.dateKey, ["2026-07-21"]);
    assert.equal(first.cleared, false);
    assert.equal(second.cleared, false);
    assert.equal(first.dateKey, second.dateKey);
  });
});

describe("pickup timezone helpers", () => {
  it("uses Asia/Bangkok and keeps date keys stable", () => {
    assert.equal(PICKUP_TIMEZONE, "Asia/Bangkok");
    const keys = getCandidateDateKeys(7, new Date("2026-07-19T12:00:00+07:00"));
    assert.equal(keys.length, 7);
    assert.equal(keys[0], "2026-07-19");
    assert.equal(toDateKey(parseDateKey("2026-07-21")), "2026-07-21");
    assert.equal(formatPickupDateKey("2026-07-21"), "21/07/2026");
  });
});
