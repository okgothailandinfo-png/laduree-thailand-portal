import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";
import {
  toDomainOrder,
  toDomainProduct,
} from "@/src/server/repositories/prisma/mappers";

describe("Sprint 29 — Prisma domain mapping parity", () => {
  it("maps allergen + modifierGroupsJson onto Product domain", () => {
    const mock = MOCK_PRODUCTS[0]!;
    const product = toDomainProduct({
      id: mock.id,
      categoryId: mock.categoryId,
      slug: mock.slug,
      sku: mock.sku,
      title: mock.title,
      description: mock.description,
      allergenLabel: mock.allergenLabel,
      allergenText: mock.allergenText,
      storageLabel: mock.storageLabel,
      storageText: mock.storageText,
      priceMinor: mock.priceMinor,
      currency: "THB",
      isActive: true,
      available: true,
      sortOrder: 1,
      modifierGroupsJson: mock.modifierGroups,
      createdAt: new Date("2026-08-09T00:00:00.000Z"),
      updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      images: [],
    });

    assert.equal(product.allergenLabel, mock.allergenLabel);
    assert.equal(product.allergenText, mock.allergenText);
    assert.equal(product.modifierGroups.length, mock.modifierGroups.length);
    assert.equal(product.modifierGroups[0]?.exactSelectionQuantity, 8);
  });

  it("maps sourceCartId onto Order domain when present", () => {
    const cartId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const order = toDomainOrder({
      id: "11111111-1111-4111-8111-111111111111",
      orderNumber: "DRAFT-TEST1234",
      status: "PENDING",
      serviceType: "PICKUP",
      customerId: "22222222-2222-4222-8222-222222222222",
      boutiqueId: "33333333-3333-4333-8333-333333333333",
      pickupSlotId: "44444444-4444-4444-8444-444444444444",
      sourceCartId: cartId,
      currency: "THB",
      totalMinor: 99000,
      specialRequest: null,
      termsAccepted: true,
      deliveryRecipient: null,
      deliveryPhone: null,
      deliveryAddress: null,
      deliverySubdistrict: null,
      deliveryDistrict: null,
      deliveryProvince: null,
      deliveryPostalCode: null,
      deliveryFeeMinor: null,
      deliveryZoneId: null,
      deliveryFeeStrategy: null,
      createdAt: new Date("2026-08-09T00:00:00.000Z"),
      updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      customer: {
        id: "22222222-2222-4222-8222-222222222222",
        customerName: "Parity Test",
        mobileNumber: "+66812345678",
        email: "parity@example.com",
        recipientName: null,
        recipientPhone: null,
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      },
      boutique: {
        id: "33333333-3333-4333-8333-333333333333",
        name: "[BOUTIQUE PENDING APPROVAL]",
        code: "[OUTLET CODE PENDING APPROVAL]",
        address: "[ADDRESS PENDING APPROVAL]",
        openingHours: "[CONTENT PENDING APPROVAL]",
        lastOrderTime: "[CONTENT PENDING APPROVAL]",
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      },
      pickupSlot: {
        id: "44444444-4444-4444-8444-444444444444",
        boutiqueId: "33333333-3333-4333-8333-333333333333",
        dateKey: "2026-08-10",
        label: "10:00–10:30",
        startTime: "10:00",
        endTime: "10:30",
        capacity: null,
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      },
      items: [],
      payment: null,
    });

    assert.equal(order.sourceCartId, cartId);
    assert.equal(order.serviceType, "PICKUP");
  });

  it("omits sourceCartId when prisma column is null", () => {
    const order = toDomainOrder({
      id: "11111111-1111-4111-8111-111111111111",
      orderNumber: "DRAFT-TEST5678",
      status: "PENDING",
      serviceType: "PICKUP",
      customerId: "22222222-2222-4222-8222-222222222222",
      boutiqueId: "33333333-3333-4333-8333-333333333333",
      pickupSlotId: "44444444-4444-4444-8444-444444444444",
      sourceCartId: null,
      currency: "THB",
      totalMinor: 99000,
      specialRequest: null,
      termsAccepted: true,
      deliveryRecipient: null,
      deliveryPhone: null,
      deliveryAddress: null,
      deliverySubdistrict: null,
      deliveryDistrict: null,
      deliveryProvince: null,
      deliveryPostalCode: null,
      deliveryFeeMinor: null,
      deliveryZoneId: null,
      deliveryFeeStrategy: null,
      createdAt: new Date("2026-08-09T00:00:00.000Z"),
      updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      customer: {
        id: "22222222-2222-4222-8222-222222222222",
        customerName: "Parity Test",
        mobileNumber: "+66812345678",
        email: "parity@example.com",
        recipientName: null,
        recipientPhone: null,
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      },
      boutique: {
        id: "33333333-3333-4333-8333-333333333333",
        name: "[BOUTIQUE PENDING APPROVAL]",
        code: "[OUTLET CODE PENDING APPROVAL]",
        address: "[ADDRESS PENDING APPROVAL]",
        openingHours: "[CONTENT PENDING APPROVAL]",
        lastOrderTime: "[CONTENT PENDING APPROVAL]",
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      },
      pickupSlot: {
        id: "44444444-4444-4444-8444-444444444444",
        boutiqueId: "33333333-3333-4333-8333-333333333333",
        dateKey: "2026-08-10",
        label: "10:00–10:30",
        startTime: "10:00",
        endTime: "10:30",
        capacity: null,
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        updatedAt: new Date("2026-08-09T00:00:00.000Z"),
      },
      items: [],
      payment: null,
    });

    assert.equal(order.sourceCartId, undefined);
  });
});
