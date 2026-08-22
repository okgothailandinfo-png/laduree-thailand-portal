import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDemoPreorderConfig,
  DEMO_DELIVERY_FEE_MINOR,
  DEMO_DELIVERY_ZONES,
  DEMO_POSTAL_EARLIEST,
  DEMO_POSTAL_LATER,
  DEMO_POSTAL_UNSUPPORTED,
  isDeliveryDemoFixtureEnabled,
  resolveDemoEarliestPromise,
} from "@/src/server/delivery/demo-fixture";
import { createRuntimeDeliveryFeeEngine } from "@/src/server/delivery/runtime";
import { createDeliveryFeeEngine } from "@/src/server/delivery/fee-engine";
import { createDeliveryAvailabilityEngine } from "@/src/server/delivery/availability";

describe("Delivery demo fixture gating", () => {
  it("is disabled in production and public preview regardless of DELIVERY_DEMO flag", () => {
    assert.equal(
      isDeliveryDemoFixtureEnabled({
        appEnv: "production",
        nodeEnv: "production",
        deliveryDemo: "1",
      }),
      false,
    );
    assert.equal(
      isDeliveryDemoFixtureEnabled({
        appEnv: "preview",
        nodeEnv: "production",
        deliveryDemo: "1",
      }),
      false,
    );
  });

  it("is enabled in development and test by default", () => {
    assert.equal(
      isDeliveryDemoFixtureEnabled({
        appEnv: "development",
        nodeEnv: "development",
        deliveryDemo: "",
      }),
      true,
    );
    assert.equal(
      isDeliveryDemoFixtureEnabled({
        appEnv: "test",
        nodeEnv: "test",
        deliveryDemo: "",
      }),
      true,
    );
  });

  it("can be opted out with DELIVERY_DEMO=0", () => {
    assert.equal(
      isDeliveryDemoFixtureEnabled({
        appEnv: "development",
        nodeEnv: "development",
        deliveryDemo: "0",
      }),
      false,
    );
  });

  it("production empty configuration remains safely unavailable", () => {
    const fees = createDeliveryFeeEngine();
    const availability = createDeliveryAvailabilityEngine();
    const quote = fees.quote({
      address: { postalCode: DEMO_POSTAL_EARLIEST },
    });
    assert.equal(quote.matched, false);
    assert.equal(quote.feeMinor, null);
    const promise = availability.resolveEarliestAvailable(
      new Date("2026-07-28T10:00:00.000+07:00"),
    );
    assert.equal(promise.available, false);
    assert.equal(availability.listPreorderDateKeys().length, 0);
  });
});

describe("Delivery demo fixture behavior", () => {
  it("supported demo postal returns trusted fee from demo zones", () => {
    const engine = createDeliveryFeeEngine(DEMO_DELIVERY_ZONES);
    const quote = engine.quote({
      address: { postalCode: DEMO_POSTAL_EARLIEST },
    });
    assert.equal(quote.matched, true);
    assert.equal(quote.feeMinor, DEMO_DELIVERY_FEE_MINOR);
    assert.equal(quote.reason, "FLAT_RATE");
  });

  it("unsupported demo postal does not match a zone", () => {
    const engine = createDeliveryFeeEngine(DEMO_DELIVERY_ZONES);
    const quote = engine.quote({
      address: { postalCode: DEMO_POSTAL_UNSUPPORTED },
    });
    assert.equal(quote.matched, false);
    assert.equal(quote.feeMinor, null);
  });

  it("earliest postal can return same-day with system window", () => {
    const availability = createDeliveryAvailabilityEngine(
      [
        {
          id: "demo-rule-earliest",
          sameDayCutoffTime: "22:00",
          nextDayEnabled: true,
          earliestTimeWindow: {
            id: "demo-window-1230-1530",
            label: "12:30–15:30",
            start: "12:30",
            end: "15:30",
          },
          isActive: true,
        },
      ],
    );
    const base = availability.resolveEarliestAvailable(
      new Date("2026-07-28T10:00:00.000+07:00"),
    );
    const promise = resolveDemoEarliestPromise(
      DEMO_POSTAL_EARLIEST,
      new Date("2026-07-28T10:00:00.000+07:00"),
      base,
    );
    assert.equal(promise.available, true);
    assert.equal(promise.relativeLabel, "Today");
    assert.ok(promise.timeWindow);
  });

  it("later postal returns a later delivery date with system window", () => {
    const promise = resolveDemoEarliestPromise(
      DEMO_POSTAL_LATER,
      new Date("2026-07-28T10:00:00.000+07:00"),
    );
    assert.equal(promise.available, true);
    assert.equal(promise.dateKey, "2026-07-30");
    assert.equal(promise.reason, "LATER_DATE");
    assert.equal(promise.timeWindow?.label, "12:30–15:30");
  });

  it("preorder catalog lists only future dates with system windows", () => {
    const config = buildDemoPreorderConfig(
      new Date("2026-07-28T10:00:00.000+07:00"),
    );
    const keys = [...config.windowByDateKey.keys()].sort();
    assert.deepEqual(keys, [
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
    assert.ok(!keys.includes("2026-07-28"));
    for (const key of keys) {
      assert.equal(config.windowByDateKey.get(key)?.id, "demo-window-1230-1530");
    }
  });

  it("runtime fee engine uses demo zones when fixture enabled in this process", () => {
    // test:pickup runs with NODE_ENV=test → demo on unless opted out.
    if (!isDeliveryDemoFixtureEnabled()) {
      assert.ok(true);
      return;
    }
    const engine = createRuntimeDeliveryFeeEngine();
    const quote = engine.quote({
      address: { postalCode: DEMO_POSTAL_EARLIEST },
    });
    assert.equal(quote.feeMinor, DEMO_DELIVERY_FEE_MINOR);
  });
});
