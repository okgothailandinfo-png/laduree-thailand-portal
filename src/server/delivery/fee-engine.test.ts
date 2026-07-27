import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDeliveryFeeEngine,
  ConfigurableDeliveryFeeEngine,
} from "@/src/server/delivery/fee-engine";
import type { DeliveryZone } from "@/src/server/models/delivery";
import {
  getCourierProvider,
  listCourierProviders,
} from "@/src/server/delivery/courier/providers";

const sampleAddress = {
  recipient: "Test",
  phone: "+66812345678",
  address: "1 Road",
  subdistrict: "Lumphini",
  district: "Pathum Wan",
  province: "Bangkok",
  postalCode: "10330",
};

describe("DeliveryFeeEngine", () => {
  it("returns NO_ZONE_MATCH with null fee when no zones configured (never invents)", () => {
    const engine = createDeliveryFeeEngine();
    const quote = engine.quote({ address: sampleAddress });
    assert.equal(quote.matched, false);
    assert.equal(quote.feeMinor, null);
    assert.equal(quote.reason, "NO_ZONE_MATCH");
  });

  it("quotes flat rate when postal code matches an active zone", () => {
    const zones: DeliveryZone[] = [
      {
        id: "z1",
        name: "Bangkok",
        postalCodes: ["10330"],
        provinces: [],
        districts: [],
        strategy: "FLAT_RATE",
        flatRateMinor: 5000,
        isActive: true,
      },
    ];
    const engine = new ConfigurableDeliveryFeeEngine(zones);
    const quote = engine.quote({ address: sampleAddress });
    assert.equal(quote.matched, true);
    assert.equal(quote.feeMinor, 5000);
    assert.equal(quote.reason, "FLAT_RATE");
    assert.equal(quote.strategy, "FLAT_RATE");
  });

  it("returns ZONE_FEE_PENDING with null fee when flat rate is not approved", () => {
    const engine = createDeliveryFeeEngine([
      {
        id: "z-pending",
        name: "Pending",
        postalCodes: ["10330"],
        provinces: [],
        districts: [],
        strategy: "FLAT_RATE",
        flatRateMinor: null,
        isActive: true,
      },
    ]);
    const quote = engine.quote({ address: sampleAddress });
    assert.equal(quote.matched, true);
    assert.equal(quote.feeMinor, null);
    assert.equal(quote.reason, "ZONE_FEE_PENDING");
  });

  it("reserves distance strategy without inventing a fee", () => {
    const engine = createDeliveryFeeEngine([
      {
        id: "z-distance",
        name: "Distance",
        postalCodes: ["10330"],
        provinces: [],
        districts: [],
        strategy: "DISTANCE",
        flatRateMinor: null,
        distanceConfig: {
          baseFeeMinor: null,
          perKmMinor: null,
          maxDistanceMeters: null,
        },
        isActive: true,
      },
    ]);
    const quote = engine.quote({
      address: sampleAddress,
      distanceMeters: 2500,
    });
    assert.equal(quote.matched, true);
    assert.equal(quote.feeMinor, null);
    assert.equal(quote.reason, "DISTANCE_UNSUPPORTED");
  });
});

describe("Courier provider stubs", () => {
  it("exposes GrabExpress, Lalamove, LINE MAN, and Flash", () => {
    const ids = listCourierProviders().map((p) => p.id);
    assert.deepEqual(ids, [
      "grab_express",
      "lalamove",
      "line_man",
      "flash",
    ]);
  });

  it("returns UNSUPPORTED quotes with null fee (no API integration)", async () => {
    for (const provider of listCourierProviders()) {
      const quote = await provider.quoteDelivery({
        pickupLabel: "Boutique",
        dropoff: sampleAddress,
      });
      assert.equal(quote.status, "UNSUPPORTED");
      assert.equal(quote.feeMinor, null);
      assert.equal(quote.currency, "THB");
    }
    const grab = getCourierProvider("grab_express");
    assert.equal(grab.displayName, "GrabExpress");
  });
});
