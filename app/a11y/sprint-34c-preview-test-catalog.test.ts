import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateProductPurchasability } from "@/lib/catalog/product-purchasability";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import {
  PREVIEW_TEST_CATALOG_PRICE_MINOR,
  applyPreviewTestCatalogOverlay,
} from "@/lib/preview/preview-test-catalog";
import { PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
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
import { MockProductRepository } from "@/src/server/repositories/mock/product.repository";
import { AppError } from "@/src/server/utils/errors";

const completeNapoleonModifiers = [
  { label: "Rose", quantity: 4 },
  { label: "Chocolate", quantity: 4 },
];

function withEnv<T>(
  values: Record<string, string | undefined>,
  fn: () => T,
): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(values)) {
      const prior = previous[key];
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
  }
}

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

function isPreviewCommerceError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    error.code === "FORBIDDEN" &&
    error.status === 403 &&
    Boolean(
      error.details &&
        typeof error.details === "object" &&
        (error.details as { code?: string }).code ===
          PUBLIC_PREVIEW_COMMERCE_CODE,
    )
  );
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

describe("Sprint 34C — preview test catalog cart path", () => {
  it("lets LDR003 configure and enter the cart in preview test mode", async () => {
    const product = overlayLdr003();
    assert.equal(evaluateProductPurchasability(product).purchasable, true);
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
        assert.equal(cart.items[0]?.productId, "prod-ldr003");
        assert.equal(cart.items[0]?.unitPriceMinor, PREVIEW_TEST_CATALOG_PRICE_MINOR);
      },
    );
  });

  it("keeps LDR003 non-purchasable and cart-blocked without PREVIEW_TEST_CATALOG", async () => {
    const raw = buildThailandCatalog().products.find(
      (item) => item.sku === "LDR003",
    );
    assert.ok(raw);
    assert.equal(evaluateProductPurchasability(raw).purchasable, false);

    const service = new DefaultCartService(
      memoryCartRepo(),
      singleProductRepo(raw),
    );
    await withEnvAsync({ APP_ENV: "preview", PREVIEW_TEST_CATALOG: undefined }, async () => {
      await assert.rejects(
        () =>
          service.addItem(undefined, {
            productId: raw.id,
            quantity: 1,
            modifiers: completeNapoleonModifiers,
          }),
        isPreviewCommerceError,
      );
    });
  });

  it("keeps Production non-purchasable even if PREVIEW_TEST_CATALOG=true", async () => {
    const raw = buildThailandCatalog().products.find(
      (item) => item.sku === "LDR003",
    );
    assert.ok(raw);
    const overlaid = applyPreviewTestCatalogOverlay(raw, {
      APP_ENV: "production",
      PREVIEW_TEST_CATALOG: "true",
    } as NodeJS.ProcessEnv);
    assert.equal(evaluateProductPurchasability(overlaid).purchasable, false);

    await withEnvAsync(
      { APP_ENV: "production", PREVIEW_TEST_CATALOG: "true" },
      async () => {
        const listed = await new MockProductRepository().list();
        assert.equal(listed.length, 0);
        const bySku = await new MockProductRepository().findBySku("LDR003");
        assert.equal(bySku && evaluateProductPurchasability(bySku).purchasable, false);
      },
    );
  });

  it("still blocks delivery checkout in preview test mode", async () => {
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
                  recipient: "Ada Lovelace",
                  phone: "+66812345678",
                  address: "1 Test Street",
                  subdistrict: "Lumphini",
                  district: "Pathum Wan",
                  province: "Bangkok",
                  postalCode: "10330",
                },
              },
            }),
          isPreviewCommerceError,
        );
      },
    );
  });

  it("rejects incomplete Macaron box selection in preview test mode", async () => {
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
                { label: "Rose", quantity: 3 },
                { label: "Chocolate", quantity: 4 },
              ],
            }),
          (error: unknown) =>
            error instanceof AppError && error.code === "VALIDATION_ERROR",
        );
      },
    );
  });
});
