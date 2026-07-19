import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DefaultCartService } from "@/src/server/services/cart.service";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import type {
  CartRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

const ACK =
  "[CONTENT PENDING APPROVAL] I acknowledge & agree to proceed with my pickup order.";

function makeProduct(overrides?: Partial<Product>): Product {
  return {
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
      {
        id: "gifting-ribbon",
        title: "Add a Gifting Ribbon Bow:",
        requiredText: null,
        type: "radio",
        required: false,
        options: ["1 x Gifting Ribbon Bow (M)"],
        optionDetails: [
          {
            label: "1 x Gifting Ribbon Bow (M)",
            priceMinor: 5000,
            isActive: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function createService(product = makeProduct()) {
  const carts = new Map<string, Cart>();
  const cartRepo: CartRepository = {
    async findById(id) {
      return carts.get(id) ?? null;
    },
    async save(cart) {
      const next = {
        ...cart,
        items: cart.items.map((item) => ({
          ...item,
          modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
        })),
        updatedAt: new Date().toISOString(),
      };
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
  return new DefaultCartService(cartRepo, productRepo);
}

const completeModifiers = [
  { label: "Rose", quantity: 4 },
  { label: "Chocolate", quantity: 4 },
  { label: ACK },
];

describe("DefaultCartService ordering parity", () => {
  it("stores flavour quantities on the cart line", async () => {
    const service = createService();
    const cart = await service.addItem(undefined, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 1,
      modifiers: completeModifiers,
    });
    assert.equal(cart.items.length, 1);
    assert.deepEqual(cart.items[0]?.modifiers, completeModifiers);
  });

  it("merges identical configurations including outer quantity", async () => {
    const service = createService();
    const first = await service.addItem(undefined, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 1,
      modifiers: completeModifiers,
    });
    const second = await service.addItem(first.id, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 2,
      modifiers: completeModifiers,
    });
    assert.equal(second.items.length, 1);
    assert.equal(second.items[0]?.quantity, 3);
  });

  it("keeps different gift options as separate lines", async () => {
    const service = createService();
    const first = await service.addItem(undefined, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 1,
      modifiers: completeModifiers,
    });
    const second = await service.addItem(first.id, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 1,
      modifiers: [...completeModifiers, { label: "1 x Gifting Ribbon Bow (M)" }],
    });
    assert.equal(second.items.length, 2);
  });

  it("includes approved add-on price in trusted subtotal", async () => {
    const service = createService();
    const cart = await service.addItem(undefined, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 2,
      modifiers: [...completeModifiers, { label: "1 x Gifting Ribbon Bow (M)" }],
    });
    assert.equal(cart.items[0]?.unitPriceMinor, 104000);
    assert.equal(cart.subtotalThb, 2080);
  });

  it("rejects incomplete acknowledgement", async () => {
    const service = createService();
    await assert.rejects(
      () =>
        service.addItem(undefined, {
          productId: "prod-napoleon-iii-macaron-8pcs",
          quantity: 1,
          modifiers: [
            { label: "Rose", quantity: 4 },
            { label: "Chocolate", quantity: 4 },
          ],
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });

  it("rejects incomplete flavour selection", async () => {
    const service = createService();
    await assert.rejects(
      () =>
        service.addItem(undefined, {
          productId: "prod-napoleon-iii-macaron-8pcs",
          quantity: 1,
          modifiers: [{ label: "Rose", quantity: 3 }, { label: ACK }],
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });

  it("rejects add when catalog price is unavailable", async () => {
    const service = createService(
      makeProduct({ priceThb: null, priceMinor: null }),
    );
    await assert.rejects(
      () =>
        service.addItem(undefined, {
          productId: "prod-napoleon-iii-macaron-8pcs",
          quantity: 1,
          modifiers: completeModifiers,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "VALIDATION_ERROR" &&
        error.message.includes("Price unavailable"),
    );
  });

  it("does not alter subtotal when optional unpriced add-on is omitted", async () => {
    const service = createService(
      makeProduct({
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
          {
            id: "unpriced-addon",
            title: "Optional add-on",
            requiredText: null,
            type: "radio",
            required: false,
            options: ["Unpriced Ribbon"],
            optionDetails: [
              {
                label: "Unpriced Ribbon",
                priceMinor: null,
                isActive: true,
              },
            ],
          },
        ],
      }),
    );
    const cart = await service.addItem(undefined, {
      productId: "prod-napoleon-iii-macaron-8pcs",
      quantity: 1,
      modifiers: completeModifiers,
    });
    assert.equal(cart.subtotalThb, 990);
    assert.equal(cart.items[0]?.unitPriceMinor, 99000);
  });
});
