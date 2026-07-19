import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Cart } from "@/src/server/models/cart";
import type { Order } from "@/src/server/models/order";
import type { Product } from "@/src/server/models/product";
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

function createService(options?: {
  slotDateKey?: string;
  availableDateKey?: string;
}) {
  const slotDateKey = options?.slotDateKey ?? "";
  const availableDateKey = options?.availableDateKey ?? "2026-07-21";
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
    name: "[BOUTIQUE PENDING APPROVAL]",
    code: "PENDING",
    address: "[ADDRESS PENDING APPROVAL]",
    openingHours: "[CONTENT PENDING APPROVAL]",
    lastOrderTime: "[CONTENT PENDING APPROVAL]",
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

  const pickupRepo: PickupRepository = {
    async listSlots() {
      return [{ id: "1030-1100", label: "10:30–11:00", start: "10:30", end: "11:00" }];
    },
    async getAvailability(params) {
      if (params.boutiqueId !== "boutique-1") return null;
      if (params.dateKey !== availableDateKey) {
        return {
          boutiqueId: params.boutiqueId,
          dateKey: params.dateKey,
          timezone: "Asia/Bangkok",
          slots: [],
        };
      }
      return {
        boutiqueId: params.boutiqueId,
        dateKey: params.dateKey,
        timezone: "Asia/Bangkok",
        slots: [
          { id: "1030-1100", label: "10:30–11:00", start: "10:30", end: "11:00" },
        ],
      };
    },
    async findSlotById(id) {
      if (id !== "1030-1100") return null;
      return {
        id: "1030-1100",
        boutiqueId: null,
        dateKey: slotDateKey,
        label: "10:30–11:00",
        start: "10:30",
        end: "11:00",
      };
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
    updatePaymentStatus: unused as OrderRepository["updatePaymentStatus"],
    adminList: unused as OrderRepository["adminList"],
    adminKitchenList: unused as OrderRepository["adminKitchenList"],
    adminFindById: unused as OrderRepository["adminFindById"],
    findCustomerCompletion: unused as OrderRepository["findCustomerCompletion"],
    findCustomerHistoryByIds:
      unused as OrderRepository["findCustomerHistoryByIds"],
  };

  return {
    service: new DefaultCheckoutService(
      cartRepo,
      productRepo,
      boutiqueRepo,
      pickupRepo,
      orderRepo,
    ),
    orders,
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
    assert.equal(order.pickup.dateKey, "2026-07-21");
    assert.equal(result.total, 990);
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
