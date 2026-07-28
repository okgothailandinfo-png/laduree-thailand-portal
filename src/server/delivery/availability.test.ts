import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDeliveryAvailabilityEngine } from "@/src/server/delivery/availability";

const SAMPLE_WINDOW = {
  id: "1230-1530",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

describe("DeliveryAvailabilityEngine", () => {
  it("returns unavailable when no approved cut-off rule exists", () => {
    const engine = createDeliveryAvailabilityEngine();
    const promise = engine.resolveEarliestAvailable(
      new Date("2026-07-27T10:00:00.000+07:00"),
    );
    assert.equal(promise.available, false);
    assert.equal(promise.reason, "NO_RULE");
    assert.equal(promise.dateKey, null);
    assert.equal(promise.timeWindow, null);
  });

  it("returns unavailable when cut-off exists but window is not approved", () => {
    const engine = createDeliveryAvailabilityEngine([
      {
        id: "r1",
        sameDayCutoffTime: "14:00",
        nextDayEnabled: true,
        earliestTimeWindow: null,
        isActive: true,
      },
    ]);
    const promise = engine.resolveEarliestAvailable(
      new Date("2026-07-27T10:00:00.000+07:00"),
    );
    assert.equal(promise.available, false);
    assert.equal(promise.reason, "WINDOW_PENDING");
  });

  it("EARLIEST_AVAILABLE returns Today before cut-off with system window", () => {
    const engine = createDeliveryAvailabilityEngine([
      {
        id: "r1",
        sameDayCutoffTime: "14:00",
        nextDayEnabled: true,
        earliestTimeWindow: SAMPLE_WINDOW,
        isActive: true,
      },
    ]);
    const before = engine.resolveEarliestAvailable(
      new Date("2026-07-27T10:00:00.000+07:00"),
    );
    assert.equal(before.available, true);
    assert.equal(before.relativeLabel, "Today");
    assert.equal(before.reason, "SAME_DAY");
    assert.equal(before.dateKey, "2026-07-27");
    assert.equal(before.timeWindow?.id, "1230-1530");
  });

  it("EARLIEST_AVAILABLE can return a later delivery date after cut-off", () => {
    const engine = createDeliveryAvailabilityEngine([
      {
        id: "r1",
        sameDayCutoffTime: "14:00",
        nextDayEnabled: true,
        earliestTimeWindow: SAMPLE_WINDOW,
        isActive: true,
      },
    ]);
    const after = engine.resolveEarliestAvailable(
      new Date("2026-07-27T15:00:00.000+07:00"),
    );
    assert.equal(after.available, true);
    assert.equal(after.relativeLabel, "Tomorrow");
    assert.equal(after.reason, "NEXT_DAY");
    assert.equal(after.dateKey, "2026-07-28");
    assert.ok(after.timeWindow);
  });

  it("PREORDER lists only future dates and assigns system window", () => {
    const engine = createDeliveryAvailabilityEngine([], {
      windowByDateKey: new Map([
        ["2026-07-27", SAMPLE_WINDOW],
        ["2026-07-28", SAMPLE_WINDOW],
        ["2026-07-30", { ...SAMPLE_WINDOW, id: "1000-1300", label: "10:00–13:00", start: "10:00", end: "13:00" }],
      ]),
    });
    const now = new Date("2026-07-27T10:00:00.000+07:00");
    const keys = engine.listPreorderDateKeys(now);
    assert.deepEqual(keys, ["2026-07-28", "2026-07-30"]);

    const today = engine.resolvePreorderWindow("2026-07-27", now);
    assert.equal(today.available, false);
    assert.equal(today.reason, "TODAY_OR_PAST");

    const past = engine.resolvePreorderWindow("2026-07-20", now);
    assert.equal(past.available, false);
    assert.equal(past.reason, "TODAY_OR_PAST");

    const ok = engine.resolvePreorderWindow("2026-07-30", now);
    assert.equal(ok.available, true);
    assert.equal(ok.timeWindow?.id, "1000-1300");
    assert.equal(ok.reason, "OK");
  });

  it("PREORDER unavailable when catalog empty", () => {
    const engine = createDeliveryAvailabilityEngine();
    const result = engine.resolvePreorderWindow(
      "2026-08-01",
      new Date("2026-07-27T10:00:00.000+07:00"),
    );
    assert.equal(result.available, false);
    assert.equal(result.reason, "NO_CATALOG");
  });
});
