import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import {
  PREVIEW_TEST_CATALOG_PRICE_MINOR,
  applyPreviewTestCatalogOverlay,
} from "@/lib/preview/preview-test-catalog";
import { PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import { vercelPreviewOrigins } from "@/src/server/http/csrf";
import { DefaultCartService } from "@/src/server/services/cart.service";
import { DefaultCheckoutService } from "@/src/server/services/checkout.service";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import type {
  BoutiqueRepository,
  CartRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { PreviewCookieCartRepository } from "@/src/server/preview/preview-cart-repository";
import { MockCartRepository } from "@/src/server/repositories/mock/cart.repository";
import { AppError } from "@/src/server/utils/errors";

const completeNapoleonModifiers = [
  { label: "Almond", quantity: 2 },
  { label: "Chocolate", quantity: 2 },
  { label: "Coffee", quantity: 1 },
  { label: "Lemon", quantity: 1 },
  { label: "« Asia Exclusive » Matcha", quantity: 1 },
  { label: "Marie-Antoinette Tea", quantity: 1 },
];

async function withEnvAsync<T>(
  values: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(values)) {
      const prior = previous[key];
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
  }
}

function unused(): never {
  throw new Error("repository should not be reached");
}

function memoryCartRepo(): CartRepository {
  const carts = new Map<string, Cart>();
  return {
    async findById(id) {
      return carts.get(id) ?? null;
    },
    async save(cart) {
      carts.set(cart.id, cart);
      return cart;
    },
    async delete(id) {
      carts.delete(id);
    },
  };
}

function singleProductRepo(product: Product): ProductRepository {
  return {
    async list() {
      return [product];
    },
    async findBySlug() {
      return product;
    },
    async findById(id) {
      return id === product.id ? product : null;
    },
    async findBySku() {
      return product;
    },
    async adminList() {
      unused();
    },
    async create() {
      unused();
    },
    async update() {
      unused();
    },
    async remove() {
      unused();
    },
    async countByCategoryId() {
      return 1;
    },
  };
}

function unusedBoutiqueRepo(): BoutiqueRepository {
  return {
    list: unused,
    findById: unused,
    findByCode: unused,
  };
}

function unusedPickupRepo(): PickupRepository {
  return {
    getAvailability: unused,
    listSlots: unused,
    findSlotById: unused,
    reserveSlotCapacity: unused,
    releaseSlotCapacity: unused,
  };
}

function unusedOrderRepo(): OrderRepository {
  return {
    create: unused,
    findById: unused,
    findByOrderNumber: unused,
    updateStatus: unused,
    updateOrderNumber: unused,
    attachPayment: unused,
    updatePaymentStatus: unused,
    adminList: unused,
    adminKitchenList: unused,
    adminFindById: unused,
    findCustomerCompletion: unused,
    findCustomerHistoryByIds: unused,
  };
}

function overlayLdr003(): Product {
  const product = buildThailandCatalog().products.find(
    (item) => item.sku === "LDR003",
  );
  assert.ok(product);
  return applyPreviewTestCatalogOverlay(product, {
    APP_ENV: "preview",
    PREVIEW_TEST_CATALOG: "true",
  } as NodeJS.ProcessEnv);
}

describe("Sprint 34D — preview cart functional flow", () => {
  it("adds one configurable box, not eight macaron pieces", async () => {
    const product = overlayLdr003();
    const service = new DefaultCartService(
      memoryCartRepo(),
      singleProductRepo(product),
    );
    await withEnvAsync(
      { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
      async () => {
        const cart = await service.addItem(undefined, {
          productId: product.id,
          quantity: 1,
          modifiers: completeNapoleonModifiers,
        });
        assert.equal(cart.items.length, 1);
        assert.equal(cart.itemCount, 1);
        assert.equal(cart.items[0]?.quantity, 1);
        assert.equal(cart.items[0]?.packSize, 8);
        assert.equal(cart.items[0]?.unitPriceMinor, PREVIEW_TEST_CATALOG_PRICE_MINOR);
        const flavorTotal = (cart.items[0]?.modifiers ?? []).reduce(
          (sum, modifier) => sum + (modifier.quantity ?? 0),
          0,
        );
        assert.equal(flavorTotal, 8);
      },
    );
  });

  it("rejects incomplete and oversized Macaron selections", async () => {
    const product = overlayLdr003();
    const service = new DefaultCartService(
      memoryCartRepo(),
      singleProductRepo(product),
    );
    await withEnvAsync(
      { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
      async () => {
        await assert.rejects(
          () =>
            service.addItem(undefined, {
              productId: product.id,
              quantity: 1,
              modifiers: [
                { label: "Almond", quantity: 2 },
                { label: "Chocolate", quantity: 2 },
              ],
            }),
          (error: unknown) =>
            error instanceof AppError && error.code === "VALIDATION_ERROR",
        );
        await assert.rejects(
          () =>
            service.addItem(undefined, {
              productId: product.id,
              quantity: 1,
              modifiers: [
                { label: "Almond", quantity: 5 },
                { label: "Chocolate", quantity: 4 },
              ],
            }),
          (error: unknown) =>
            error instanceof AppError && error.code === "VALIDATION_ERROR",
        );
      },
    );
  });

  it("keeps checkout fail-closed after a successful preview cart add", async () => {
    const product = overlayLdr003();
    const carts = memoryCartRepo();
    const cartService = new DefaultCartService(carts, singleProductRepo(product));
    await withEnvAsync(
      { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
      async () => {
        const cart = await cartService.addItem(undefined, {
          productId: product.id,
          quantity: 1,
          modifiers: completeNapoleonModifiers,
        });
        const checkout = new DefaultCheckoutService(
          carts,
          singleProductRepo(product),
          unusedBoutiqueRepo(),
          unusedPickupRepo(),
          unusedOrderRepo(),
        );
        await assert.rejects(
          () =>
            checkout.createDraftCheckout(cart.id, {
              termsAccepted: true,
              serviceType: "PICKUP",
              customer: {
                firstName: "Ada",
                lastName: "Lovelace",
                email: "ada@example.com",
                phone: "+66812345678",
              },
              pickup: {
                boutiqueId: "boutique-1",
                dateKey: "2026-08-23",
                pickupSlotId: "1030-1100",
              },
            }),
          (error: unknown) =>
            error instanceof AppError &&
            error.status === 403 &&
            Boolean(
              error.details &&
                typeof error.details === "object" &&
                (error.details as { code?: string }).code ===
                  PUBLIC_PREVIEW_COMMERCE_CODE,
            ),
        );
      },
    );
  });

  it("does not treat Vercel Production hosts as CSRF-allowed", () => {
    assert.deepEqual(
      vercelPreviewOrigins({
        APP_ENV: "production",
        VERCEL_URL: "ok-go.cloud",
      } as NodeJS.ProcessEnv),
      [],
    );
  });

  it("wraps the mock cart repository for preview cookie restore", async () => {
    const inner = new MockCartRepository();
    const wrapped = new PreviewCookieCartRepository(inner);
    const saved = await wrapped.save({
      id: "cart-preview-1",
      currency: "THB",
      items: [],
      updatedAt: new Date().toISOString(),
    });
    assert.equal(saved.id, "cart-preview-1");
    const found = await wrapped.findById("cart-preview-1");
    assert.equal(found?.id, "cart-preview-1");
  });
});
