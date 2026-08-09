import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Cart } from "@/src/server/models/cart";
import type { Order } from "@/src/server/models/order";
import type { Product } from "@/src/server/models/product";
import type { DeliveryZone } from "@/src/server/models/delivery";
import {
  createDeliveryAvailabilityEngine,
  createDeliveryFeeEngine,
} from "@/src/server/delivery";
import type {
  BoutiqueRepository,
  CartRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { DefaultCheckoutService } from "@/src/server/services/checkout.service";
import { AppError } from "@/src/server/utils/errors";

const ACK =
  "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.";

const product: Product = {
  id: "prod-napoleon-iii-macaron-8pcs",
  slug: "napoleon-iii-macaron-8pcs",
  sku: "SKU-NAPOLEON-8",
  title: "« Napoléon III » Macaron - 8pcs",
  categoryId: "cat-macaron-gift-boxes",
  description: ["Sample"],
  allergenLabel: "Allergen Information:",
  allergenText: "Kindly refer to the Allergens page.",
  storageLabel: "Storage Information:",
  storageText: "Macarons can be stored for up to 4 days in the Chiller.",
  priceThb: 990,
  priceMinor: 99000,
  currency: "THB",
  imagePlaceholder: "/product-placeholder.svg",
  images: [],
  isActive: true,
  available: true,
  sortOrder: 1,
  modifierGroups: [
    {
      id: "choice-of-macarons",
      title: "Choice of Macarons:",
      requiredText: "Please select 8",
      type: "quantity",
      exactSelectionQuantity: 8,
      required: true,
      options: ["Rose", "Chocolate"],
    },
    {
      id: "pickup-acknowledgement",
      title:
        "[CONTENT PENDING APPROVAL] Product handling acknowledgement (Pickup)",
      requiredText: "Please select 1",
      type: "radio",
      required: true,
      isAcknowledgement: true,
      options: [ACK],
    },
  ],
};

const deliveryAddress = {
  recipient: "Ada Lovelace",
  phone: "+66812345678",
  address: "1 Test Road",
  subdistrict: "Lumphini",
  district: "Pathum Wan",
  province: "Bangkok",
  postalCode: "10330",
};

const zoneWithFee: DeliveryZone = {
  id: "zone-bkk-test",
  name: "Bangkok test zone",
  postalCodes: ["10330"],
  provinces: ["Bangkok"],
  districts: [],
  boutiqueId: null,
  strategy: "FLAT_RATE",
  flatRateMinor: 8000,
  isActive: true,
};

const zoneFeePending: DeliveryZone = {
  ...zoneWithFee,
  id: "zone-pending",
  flatRateMinor: null,
};


const SAMPLE_WINDOW = {
  id: "1230-1530",
  label: "12:30–15:30",
  start: "12:30",
  end: "15:30",
};

const EARLIEST_RULE = {
  id: "rule-1",
  sameDayCutoffTime: "23:59",
  nextDayEnabled: true,
  earliestTimeWindow: SAMPLE_WINDOW,
  isActive: true,
};

function createService(options?: {
  slotDateKey?: string;
  availableDateKey?: string;
  /** null = unlimited (default); finite values exercise capacity decrement. */
  slotCapacity?: number | null;
  zones?: DeliveryZone[];
  availabilityRules?: Parameters<
    typeof createDeliveryAvailabilityEngine
  >[0];
  preorderConfig?: Parameters<typeof createDeliveryAvailabilityEngine>[1];
}) {
  const slotDateKey = options?.slotDateKey ?? "";
  const availableDateKey = options?.availableDateKey ?? "2026-07-21";
  let slotCapacity: number | null =
    options?.slotCapacity === undefined ? null : options.slotCapacity;
  const carts = new Map<string, Cart>();
  const cart: Cart = {
    id: "cart-1",
    currency: "THB",
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "line-1",
        productId: product.id,
        name: product.title,
        imageSrc: product.imagePlaceholder,
        quantity: 1,
        modifiers: [
          { label: "Rose", quantity: 4 },
          { label: "Chocolate", quantity: 4 },
          { label: ACK },
        ],
        unitPriceMinor: 99000,
        productAvailable: true,
        exactSelectionQuantity: 8,
      },
    ],
  };
  carts.set(cart.id, cart);

  const cartRepo: CartRepository = {
    async findById(id) {
      return carts.get(id) ?? null;
    },
    async save(next) {
      carts.set(next.id, next);
      return next;
    },
    async delete(id) {
      carts.delete(id);
    },
  };

  const productRepo: ProductRepository = {
    async list() {
      return [product];
    },
    async findBySlug() {
      return product;
    },
    async findById() {
      return product;
    },
    async findBySku() {
      return product;
    },
    async adminList() {
      throw new Error("unused");
    },
    async create() {
      throw new Error("unused");
    },
    async update() {
      throw new Error("unused");
    },
    async remove() {
      throw new Error("unused");
    },
    async countByCategoryId() {
      return 1;
    },
  };

  const boutique = {
    id: "boutique-1",
    name: "Boutique",
    code: "B1",
    address: "Bangkok",
    openingHours: "10:00–20:00",
    lastOrderTime: "19:30",
  };
  const boutiqueRepo: BoutiqueRepository = {
    async list() {
      return [boutique];
    },
    async findById(id) {
      return id === boutique.id ? boutique : null;
    },
    async findByCode(code) {
      return code === boutique.code ? boutique : null;
    },
  };

  let pickupCalls = 0;
  const pickupRepo: PickupRepository = {
    async getAvailability({ boutiqueId, dateKey }) {
      pickupCalls += 1;
      if (dateKey !== availableDateKey) {
        return { boutiqueId, dateKey, timezone: "Asia/Bangkok", slots: [] };
      }
      if (slotCapacity !== null && slotCapacity <= 0) {
        return { boutiqueId, dateKey, timezone: "Asia/Bangkok", slots: [] };
      }
      return {
        boutiqueId,
        dateKey,
        timezone: "Asia/Bangkok",
        slots: [
          {
            id: "1030-1100",
            label: "10:30–11:00",
            start: "10:30",
            end: "11:00",
          },
        ],
      };
    },
    async listSlots() {
      return [];
    },
    async findSlotById(id) {
      if (id !== "1030-1100") return null;
      if (slotCapacity !== null && slotCapacity <= 0) return null;
      return {
        id: "1030-1100",
        boutiqueId: "boutique-1",
        dateKey: slotDateKey,
        label: "10:30–11:00",
        start: "10:30",
        end: "11:00",
      };
    },
    async reserveSlotCapacity(id) {
      if (id !== "1030-1100") {
        throw new AppError("NOT_FOUND", `Pickup slot not found: ${id}`);
      }
      if (slotCapacity === null) return;
      if (slotCapacity <= 0) {
        throw new AppError(
          "VALIDATION_ERROR",
          "pickup.pickupSlotId is not available for the selected boutique/date.",
          {
            details: {
              field: "pickup.pickupSlotId",
              code: "CAPACITY_EXHAUSTED",
            },
          },
        );
      }
      slotCapacity -= 1;
    },
    async releaseSlotCapacity(id) {
      if (id !== "1030-1100" || slotCapacity === null) return;
      slotCapacity += 1;
    },
  };

  const orders = new Map<string, Order>();
  const unused = async () => {
    throw new Error("unused");
  };
  const orderRepo: OrderRepository = {
    async create(order) {
      orders.set(order.id, order);
      return order;
    },
    async findById(id) {
      return orders.get(id) ?? null;
    },
    async findByOrderNumber(orderNumber) {
      return (
        [...orders.values()].find((order) => order.orderNumber === orderNumber) ??
        null
      );
    },
    updateStatus: unused as OrderRepository["updateStatus"],
    updateOrderNumber: unused as OrderRepository["updateOrderNumber"],
    attachPayment: unused as OrderRepository["attachPayment"],
    updatePaymentStatus: unused as OrderRepository["updatePaymentStatus"],
    adminList: unused as OrderRepository["adminList"],
    adminKitchenList: unused as OrderRepository["adminKitchenList"],
    adminFindById: unused as OrderRepository["adminFindById"],
    findCustomerCompletion: unused as OrderRepository["findCustomerCompletion"],
    findCustomerHistoryByIds:
      unused as OrderRepository["findCustomerHistoryByIds"],
  };

  const feeEngine = createDeliveryFeeEngine(options?.zones ?? []);
  const availability = createDeliveryAvailabilityEngine(
    options?.availabilityRules ?? [],
    options?.preorderConfig,
  );

  return {
    service: new DefaultCheckoutService(
      cartRepo,
      productRepo,
      boutiqueRepo,
      pickupRepo,
      orderRepo,
      feeEngine,
      availability,
    ),
    orders,
    getPickupCalls: () => pickupCalls,
    getSlotCapacity: () => slotCapacity,
  };
}

describe("DefaultCheckoutService production readiness", () => {
  it("uses client dateKey for order pickup (not mock findSlotById today stamp)", async () => {
    const { service, orders } = createService({ slotDateKey: "" });
    const result = await service.createDraftCheckout("cart-1", {
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      pickup: {
        boutiqueId: "boutique-1",
        dateKey: "2026-07-21",
        pickupSlotId: "1030-1100",
      },
      termsAccepted: true,
    });
    const order = orders.get(result.orderId);
    assert.ok(order);
    assert.equal(order.serviceType, "PICKUP");
    assert.equal(order.pickup?.dateKey, "2026-07-21");
    assert.equal(result.serviceType, "PICKUP");
    assert.equal(result.deliveryFee, null);
    assert.equal(result.total, 990);
    assert.equal(order.delivery, undefined);
  });

  it("defaults omitted serviceType to PICKUP (Pickup regression)", () => {
    const { service } = createService();
    const parsed = service.parseCheckoutBody({
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      pickup: {
        boutiqueId: "boutique-1",
        dateKey: "2026-07-21",
        pickupSlotId: "1030-1100",
      },
      termsAccepted: true,
    });
    assert.equal(parsed.serviceType, "PICKUP");
    assert.equal(parsed.delivery, undefined);
  });

  it("rejects stale pickup slots for the requested date", async () => {
    const { service } = createService({
      slotDateKey: "",
      availableDateKey: "2026-07-22",
    });
    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          pickup: {
            boutiqueId: "boutique-1",
            dateKey: "2026-07-21",
            pickupSlotId: "1030-1100",
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });

  it("requires termsAccepted true in the request body", () => {
    const { service } = createService();
    assert.throws(
      () =>
        service.parseCheckoutBody({
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          pickup: {
            boutiqueId: "boutique-1",
            dateKey: "2026-07-21",
            pickupSlotId: "1030-1100",
          },
          termsAccepted: false,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "VALIDATION_ERROR" &&
        error.message.includes("Terms"),
    );
  });

  it("Sprint 30 — persists pickup recipientName and specialRequest", async () => {
    const { service, orders } = createService();
    const parsed = service.parseCheckoutBody({
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
        recipientName: "  Charles Babbage  ",
        specialRequest: "  Please use paper bag  ",
      },
      pickup: {
        boutiqueId: "boutique-1",
        dateKey: "2026-07-21",
        pickupSlotId: "1030-1100",
      },
      termsAccepted: true,
    });
    assert.equal(parsed.customer.recipientName, "Charles Babbage");
    assert.equal(parsed.customer.specialRequest, "Please use paper bag");

    const result = await service.createDraftCheckout("cart-1", parsed);
    const order = orders.get(result.orderId);
    assert.ok(order);
    assert.equal(order.customer.recipientName, "Charles Babbage");
    assert.equal(order.customer.specialRequest, "Please use paper bag");
  });

  it("Sprint 30 — decrements finite pickup slot capacity on draft create", async () => {
    const { service, getSlotCapacity } = createService({ slotCapacity: 1 });
    await service.createDraftCheckout("cart-1", {
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      pickup: {
        boutiqueId: "boutique-1",
        dateKey: "2026-07-21",
        pickupSlotId: "1030-1100",
      },
      termsAccepted: true,
    });
    assert.equal(getSlotCapacity(), 0);
    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          pickup: {
            boutiqueId: "boutique-1",
            dateKey: "2026-07-21",
            pickupSlotId: "1030-1100",
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        // Exhausted capacity is rejected at findSlotById (NOT_FOUND) or reserve.
        error instanceof AppError &&
        (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR"),
    );
  });

  it("requires pickup.dateKey as YYYY-MM-DD", () => {
    const { service } = createService();
    assert.throws(
      () =>
        service.parseCheckoutBody({
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          pickup: {
            boutiqueId: "boutique-1",
            dateKey: "21/07/2026",
            pickupSlotId: "1030-1100",
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });
});

describe("Delivery checkout flow (no boutique)", () => {
  it("does not require boutiqueId and does not run pickup validation", async () => {
    const { service, orders, getPickupCalls } = createService({
      zones: [zoneWithFee],
      availabilityRules: [
        EARLIEST_RULE,
      ],
    });
    const parsed = service.parseCheckoutBody({
      serviceType: "DELIVERY",
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      delivery: {
        mode: "EARLIEST_AVAILABLE",
        address: deliveryAddress,
      },
      termsAccepted: true,
    });
    assert.equal(parsed.pickup, undefined);
    assert.equal(parsed.delivery?.mode, "EARLIEST_AVAILABLE");

    const before = getPickupCalls();
    const result = await service.createDraftCheckout("cart-1", parsed);
    assert.equal(getPickupCalls(), before);
    const order = orders.get(result.orderId);
    assert.ok(order);
    assert.equal(order.serviceType, "DELIVERY");
    assert.equal(order.pickup, undefined);
    assert.equal(order.delivery?.mode, "EARLIEST_AVAILABLE");
    assert.equal(order.delivery?.address.postalCode, "10330");
  });

  it("defaults delivery mode to EARLIEST_AVAILABLE when omitted in parse", () => {
    const { service } = createService();
    const parsed = service.parseCheckoutBody({
      serviceType: "DELIVERY",
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      delivery: {
        address: deliveryAddress,
      },
      termsAccepted: true,
    });
    assert.equal(parsed.delivery?.mode, "EARLIEST_AVAILABLE");
  });

  it("EARLIEST_AVAILABLE checkout does not require customer-selected date/time", async () => {
    const { service, orders } = createService({
      zones: [zoneWithFee],
      availabilityRules: [
        EARLIEST_RULE,
      ],
    });
    const result = await service.createDraftCheckout("cart-1", {
      serviceType: "DELIVERY",
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      delivery: {
        mode: "EARLIEST_AVAILABLE",
        address: deliveryAddress,
      },
      termsAccepted: true,
    });
    const order = orders.get(result.orderId);
    assert.ok(order?.delivery?.dateKey);
    assert.ok(order?.delivery?.timeSlotId);
    assert.ok(order?.delivery?.timeSlotLabel);
    assert.ok(result.deliveryPromiseRelativeLabel);
    assert.ok(result.deliveryTimeWindowLabel);
  });

  it("PREORDER mode requires future date and assigns system window", async () => {
    // Keep far enough in the future to avoid calendar drift vs Asia/Bangkok "today".
    const futureDateKey = "2026-12-15";
    const windows = new Map([
      [
        futureDateKey,
        {
          id: "1400-1430",
          label: "14:00–14:30",
          start: "14:00",
          end: "14:30",
        },
      ],
    ]);
    const { service } = createService({
      zones: [zoneWithFee],
      preorderConfig: { windowByDateKey: windows },
    });

    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          serviceType: "DELIVERY",
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          delivery: {
            mode: "PREORDER",
            address: deliveryAddress,
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError && error.message.includes("dateKey"),
    );

    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          serviceType: "DELIVERY",
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          delivery: {
            mode: "PREORDER",
            address: deliveryAddress,
            dateKey: "2026-07-28",
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.message.toLowerCase().includes("future"),
    );

    const ok = await service.createDraftCheckout("cart-1", {
      serviceType: "DELIVERY",
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      delivery: {
        mode: "PREORDER",
        address: deliveryAddress,
        dateKey: futureDateKey,
      },
      termsAccepted: true,
    });
    assert.equal(ok.deliveryMode, "PREORDER");
    assert.equal(ok.deliveryDateKey, futureDateKey);
    assert.equal(ok.deliveryTimeWindowLabel, "14:00–14:30");
  });

  it("rejects pickup payload on DELIVERY checkout", () => {
    const { service } = createService();
    assert.throws(
      () =>
        service.parseCheckoutBody({
          serviceType: "DELIVERY",
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          pickup: {
            boutiqueId: "boutique-1",
            dateKey: "2026-07-21",
            pickupSlotId: "1030-1100",
          },
          delivery: {
            mode: "EARLIEST_AVAILABLE",
            address: deliveryAddress,
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.message.includes("pickup must not be provided"),
    );
  });

  it("unsupported zone blocks checkout", async () => {
    const { service } = createService({
      zones: [zoneWithFee],
      availabilityRules: [
        EARLIEST_RULE,
      ],
    });
    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          serviceType: "DELIVERY",
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          delivery: {
            mode: "EARLIEST_AVAILABLE",
            address: {
              ...deliveryAddress,
              postalCode: "00000",
              province: "Unknown Province",
              district: "Unknown",
            },
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.message.includes("not available for delivery"),
    );
  });

  it("missing trusted delivery fee blocks checkout", async () => {
    const { service } = createService({
      zones: [zoneFeePending],
      availabilityRules: [
        EARLIEST_RULE,
      ],
    });
    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          serviceType: "DELIVERY",
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          delivery: {
            mode: "EARLIEST_AVAILABLE",
            address: deliveryAddress,
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.message.includes("Delivery fee is unavailable"),
    );
  });

  it("order confirmation payload retains delivery mode and address", async () => {
    const { service, orders } = createService({
      zones: [zoneWithFee],
      availabilityRules: [
        EARLIEST_RULE,
      ],
    });
    const result = await service.createDraftCheckout("cart-1", {
      serviceType: "DELIVERY",
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+66812345678",
      },
      delivery: {
        mode: "EARLIEST_AVAILABLE",
        address: deliveryAddress,
      },
      termsAccepted: true,
    });
    const order = orders.get(result.orderId);
    assert.ok(order?.delivery);
    assert.equal(order.delivery.mode, "EARLIEST_AVAILABLE");
    assert.equal(order.delivery.address.recipient, "Ada Lovelace");
    assert.equal(order.delivery.address.postalCode, "10330");
    assert.equal(order.delivery.feeMinor, 8000);
  });

  it("EARLIEST_AVAILABLE unavailable when no approved cut-off rule exists", async () => {
    const { service } = createService({ zones: [zoneWithFee] });
    await assert.rejects(
      () =>
        service.createDraftCheckout("cart-1", {
          serviceType: "DELIVERY",
          customer: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "+66812345678",
          },
          delivery: {
            mode: "EARLIEST_AVAILABLE",
            address: deliveryAddress,
          },
          termsAccepted: true,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.message.includes("not available at this time"),
    );
  });
});
