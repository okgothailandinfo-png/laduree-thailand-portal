import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "crypto";
import type { Order } from "@/src/server/models/order";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";

describe("MockOrderRepository delivery foundation", () => {
  it("persists PICKUP orders without delivery (Pickup regression)", async () => {
    const repo = new MockOrderRepository();
    const order: Order = {
      id: randomUUID(),
      orderNumber: "DRAFT-PICKUP",
      status: "pending",
      serviceType: "PICKUP",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items: [],
      totalMinor: 99000,
      termsAccepted: true,
      customer: {
        customerName: "Ada Lovelace",
        mobileNumber: "+66812345678",
        email: "ada@example.com",
      },
      pickup: {
        boutiqueId: "boutique-1",
        boutiqueName: "Boutique",
        address: "Bangkok",
        dateKey: "2026-07-21",
        timeSlotId: "1030-1100",
        timeSlotLabel: "10:30–11:00",
      },
    };

    const saved = await repo.create(order);
    const found = await repo.findById(saved.id);
    assert.ok(found);
    assert.equal(found?.serviceType, "PICKUP");
    assert.equal(found?.delivery, undefined);
    assert.equal(found?.pickup?.dateKey, "2026-07-21");
  });

  it("persists DELIVERY without boutique/pickup and retains mode + address", async () => {
    const repo = new MockOrderRepository();
    const order: Order = {
      id: randomUUID(),
      orderNumber: "DRAFT-DELIVERY",
      status: "pending",
      serviceType: "DELIVERY",
      currency: "THB",
      createdAt: new Date().toISOString(),
      items: [],
      totalMinor: 107000,
      termsAccepted: true,
      customer: {
        customerName: "Ada Lovelace",
        mobileNumber: "+66812345678",
        email: "ada@example.com",
        recipientName: "Ada Lovelace",
        recipientPhone: "+66812345678",
      },
      delivery: {
        mode: "EARLIEST_AVAILABLE",
        address: {
          recipient: "Ada Lovelace",
          phone: "+66812345678",
          address: "1 Test Road",
          subdistrict: "Lumphini",
          district: "Pathum Wan",
          province: "Bangkok",
          postalCode: "10330",
        },
        feeMinor: 8000,
        zoneId: "zone-bkk-test",
        feeStrategy: "FLAT_RATE",
        dateKey: "2026-07-27",
        promiseRelativeLabel: "Today",
        fulfilmentBoutiqueId: null,
      },
    };

    const saved = await repo.create(order);
    const found = await repo.findById(saved.id);
    assert.ok(found);
    assert.equal(found?.serviceType, "DELIVERY");
    assert.equal(found?.pickup, undefined);
    assert.equal(found?.delivery?.mode, "EARLIEST_AVAILABLE");
    assert.equal(found?.delivery?.address.postalCode, "10330");
    assert.equal(found?.delivery?.feeMinor, 8000);
  });
});
