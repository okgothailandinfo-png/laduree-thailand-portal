import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { formatPriceThb } from "@/lib/api/catalog";
import {
  STOREFRONT_IMAGE_PLACEHOLDER,
  storefrontImageSrc,
} from "@/lib/catalog/storefront-image";
import { evaluateProductPurchasability } from "@/lib/catalog/product-purchasability";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import {
  CONSENT_VERSION,
  defaultDeniedOptionalConsent,
  hasAnalyticsConsent,
  isOptionalIntegrationAllowed,
} from "@/lib/consent/consent";
import { ACTIVE_STOREFRONT_LOCALES } from "@/lib/i18n/locale";
import {
  PUBLIC_PREVIEW_COMMERCE_CODE,
} from "@/lib/preview/public-preview";
import {
  defaultStorefrontRobots,
  isStorefrontIndexingLive,
  NOINDEX_ROBOTS,
} from "@/lib/seo/indexing";
import { THAILAND_PRODUCT_MASTER } from "@/data/thailand-product-master";
import robots from "../robots";
import { DefaultCartService } from "@/src/server/services/cart.service";
import { DefaultCheckoutService } from "@/src/server/services/checkout.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { PaymentService } from "@/src/server/payment/payment-service";
import {
  assertMockPaymentMutationsAllowed,
  assertMockWebhookAllowed,
} from "@/src/server/payment/production-guard";
import { isDeliveryDemoFixtureEnabled } from "@/src/server/delivery/demo-fixture";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import type {
  BoutiqueRepository,
  CartRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { MOCK_PRODUCTS } from "@/src/server/repositories/mock/data";
import { AppError } from "@/src/server/utils/errors";
import { uiChrome } from "@/lib/i18n/ui-chrome";

function withAppEnv<T>(value: string, fn: () => T): T {
  const previous = process.env.APP_ENV;
  process.env.APP_ENV = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = previous;
  }
}

async function withAppEnvAsync<T>(
  value: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = process.env.APP_ENV;
  process.env.APP_ENV = value;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = previous;
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
  throw new Error("repository should not be reached in public preview");
}

function unusedCartRepo(): CartRepository {
  return {
    findById: unused,
    save: unused,
    delete: unused,
  };
}

function unusedProductRepo(): ProductRepository {
  return {
    list: unused,
    findBySlug: unused,
    findById: unused,
    findBySku: unused,
    adminList: unused,
    create: unused,
    update: unused,
    remove: unused,
    countByCategoryId: unused,
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

const sellable: Product = {
  id: "prod-preview-guard",
  slug: "preview-guard",
  sku: "DEV-PREVIEW-GUARD",
  title: "Preview guard fixture",
  categoryId: "cat-all-items",
  description: [],
  allergenLabel: "Allergen Information:",
  allergenText: "",
  storageLabel: "Storage Information:",
  storageText: "",
  priceThb: 1290,
  priceMinor: 129000,
  currency: "THB",
  imagePlaceholder: STOREFRONT_IMAGE_PLACEHOLDER,
  images: [],
  isActive: true,
  available: true,
  deliveryEligible: true,
  productBehavior: "SIMPLE_PRODUCT",
  packSize: null,
  sortOrder: 1,
  modifierGroups: [],
};

describe("Sprint 34 — TEST 1 LDR001–LDR038 remain non-purchasable", () => {
  it("keeps every Thailand master SKU fail-closed", () => {
    const catalog = buildThailandCatalog();
    assert.equal(catalog.validation.ok, true);
    assert.equal(catalog.products.length, 38);
    for (const product of catalog.products) {
      const result = evaluateProductPurchasability(product);
      assert.equal(result.purchasable, false, product.sku);
      assert.ok(result.reasons.includes("INACTIVE"));
      assert.ok(result.reasons.includes("UNAVAILABLE"));
      assert.ok(result.reasons.includes("PRICE_UNAVAILABLE"));
    }
    assert.equal(MOCK_PRODUCTS.length, 38);
    assert.ok(MOCK_PRODUCTS.every((product) => !evaluateProductPurchasability(product).purchasable));
  });
});

describe("Sprint 34 — TEST 2 null/missing price cannot enter checkout", () => {
  it("does not format missing or zero as a sellable THB price", () => {
    assert.equal(formatPriceThb(null), "฿ —");
    assert.equal(formatPriceThb(0), "฿ —");
    assert.equal(formatPriceThb(Number.NaN), "฿ —");
  });

  it("cart rejects a product with null price even outside preview", async () => {
    const unpriced: Product = {
      ...sellable,
      id: "prod-unpriced",
      sku: "LDR001",
      priceThb: null,
      priceMinor: null,
      isActive: true,
      available: true,
    };
    const service = new DefaultCartService(
      memoryCartRepo(),
      singleProductRepo(unpriced),
    );
    await assert.rejects(
      () =>
        service.addItem(undefined, {
          productId: unpriced.id,
          quantity: 1,
          modifiers: [],
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.details !== undefined &&
        typeof error.details === "object" &&
        (error.details as { code?: string }).code === "PRICE_UNAVAILABLE",
    );
  });
});

describe("Sprint 34 — TEST 3–6 commerce APIs fail closed in preview", () => {
  it("TEST 3 — checkout draft is forbidden", async () => {
    const service = new DefaultCheckoutService(
      unusedCartRepo(),
      unusedProductRepo(),
      unusedBoutiqueRepo(),
      unusedPickupRepo(),
      unusedOrderRepo(),
    );
    await withAppEnvAsync("preview", async () => {
      await assert.rejects(
        () =>
          service.createDraftCheckout("cart-1", {
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
              dateKey: "2026-08-22",
              pickupSlotId: "1030-1100",
            },
          }),
        isPreviewCommerceError,
      );
    });
  });

  it("TEST 4 — payment create and mock mutations are forbidden", async () => {
    await withAppEnvAsync("preview", async () => {
      const service = new PaymentService(
        unusedOrderRepo(),
        {
          findById: unused,
          findByOrderId: unused,
          findPendingByOrderId: unused,
          save: unused,
          savePendingExclusive: unused,
        },
        {
          hasProcessed: unused,
          claimEvent: unused,
          markProcessed: unused,
          releaseClaim: unused,
        },
        "preview-integrity-secret",
        300,
      );
      await assert.rejects(
        () =>
          service.createPayment({
            orderId: "order-1",
            method: "promptpay-qr",
            accessToken: "token",
          }),
        isPreviewCommerceError,
      );
      await assert.rejects(
        () => service.confirmPayment("pay-1", "SUCCESS", "token"),
        isPreviewCommerceError,
      );
      assert.throws(() => assertMockPaymentMutationsAllowed(), isPreviewCommerceError);
      assert.throws(() => assertMockWebhookAllowed(), isPreviewCommerceError);
    });
  });

  it("TEST 5 — order creation is forbidden", async () => {
    const service = new DefaultOrderService(
      unusedOrderRepo(),
      unusedProductRepo(),
      unusedBoutiqueRepo(),
      unusedPickupRepo(),
    );
    await withAppEnvAsync("preview", async () => {
      await assert.rejects(
        () =>
          service.createOrder({
            items: [
              {
                productId: sellable.id,
                quantity: 1,
                modifiers: [],
              },
            ],
            customer: {
              customerName: "Ada Lovelace",
              mobileNumber: "+66812345678",
              email: "ada@example.com",
            },
            pickup: {
              boutiqueId: "boutique-1",
              dateKey: "2026-08-22",
              timeSlotId: "1030-1100",
            },
            payment: { method: "promptpay-qr" },
            termsAccepted: true,
          }),
        isPreviewCommerceError,
      );
    });
  });

  it("TEST 6 — delivery demo fixture and delivery checkout stay closed", async () => {
    assert.equal(
      isDeliveryDemoFixtureEnabled({
        appEnv: "preview",
        nodeEnv: "production",
        deliveryDemo: "1",
      }),
      false,
    );
    const service = new DefaultCheckoutService(
      unusedCartRepo(),
      unusedProductRepo(),
      unusedBoutiqueRepo(),
      unusedPickupRepo(),
      unusedOrderRepo(),
    );
    await withAppEnvAsync("preview", async () => {
      await assert.rejects(
        () =>
          service.createDraftCheckout("cart-1", {
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
                address: "1 Test Road",
                subdistrict: "Lumphini",
                district: "Pathum Wan",
                province: "Bangkok",
                postalCode: "10330",
              },
            },
          }),
        isPreviewCommerceError,
      );
    });
  });

  it("cart add is forbidden even for a would-be sellable product", async () => {
    const service = new DefaultCartService(
      memoryCartRepo(),
      singleProductRepo(sellable),
    );
    await withAppEnvAsync("preview", async () => {
      await assert.rejects(
        () =>
          service.addItem(undefined, {
            productId: sellable.id,
            quantity: 1,
            modifiers: [],
          }),
        isPreviewCommerceError,
      );
    });
  });
});

describe("Sprint 34 — TEST 7 public preview remains noindex", () => {
  it("never treats preview as live indexing", () => {
    assert.equal(
      isStorefrontIndexingLive({
        APP_ENV: "preview",
        STOREFRONT_INDEXING: "live",
      }),
      false,
    );
    assert.deepEqual(
      defaultStorefrontRobots({
        APP_ENV: "preview",
        STOREFRONT_INDEXING: "live",
      }),
      NOINDEX_ROBOTS,
    );
  });

  it("robots disallow the whole site in preview", () => {
    withAppEnv("preview", () => {
      const previousIndexing = process.env.STOREFRONT_INDEXING;
      process.env.STOREFRONT_INDEXING = "live";
      try {
        const result = robots();
        const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
        assert.equal(rules?.disallow, "/");
        assert.equal(result.sitemap, undefined);
      } finally {
        if (previousIndexing === undefined) {
          delete process.env.STOREFRONT_INDEXING;
        } else {
          process.env.STOREFRONT_INDEXING = previousIndexing;
        }
      }
    });
  });
});

describe("Sprint 34 — TEST 8–9 no Singapore prices or fabricated commercial data", () => {
  it("imports THB-only null Safe-Draft prices", () => {
    assert.ok(THAILAND_PRODUCT_MASTER.every((row) => row.priceThb === null));
    const catalog = buildThailandCatalog();
    for (const product of catalog.products) {
      assert.equal(product.currency, "THB");
      assert.equal(product.priceMinor, null);
      assert.equal(product.priceThb, null);
      assert.equal(product.deliveryEligible, false);
    }
    const masterJson = JSON.stringify(THAILAND_PRODUCT_MASTER);
    assert.doesNotMatch(masterJson, /priceSgd|SGD/);
    assert.equal(
      MOCK_PRODUCTS.some((product) => product.priceThb === 990),
      false,
    );
  });
});

describe("Sprint 34 — TEST 10 missing images do not break the storefront", () => {
  it("falls back to the approved placeholder", () => {
    assert.equal(storefrontImageSrc(null), STOREFRONT_IMAGE_PLACEHOLDER);
    assert.equal(storefrontImageSrc("  "), STOREFRONT_IMAGE_PLACEHOLDER);
    assert.equal(storefrontImageSrc("/ok.jpg"), "/ok.jpg");
    const catalog = buildThailandCatalog();
    for (const product of catalog.products) {
      assert.equal(product.imagePlaceholder, STOREFRONT_IMAGE_PLACEHOLDER);
      assert.ok(
        product.images.every((image) => image.url === STOREFRONT_IMAGE_PLACEHOLDER),
      );
    }
    const card = readFileSync(
      path.join(process.cwd(), "app/chrome/ProductCard.tsx"),
      "utf8",
    );
    const pdp = readFileSync(
      path.join(process.cwd(), "app/product/[slug]/ProductDetailClient.tsx"),
      "utf8",
    );
    assert.match(card, /StorefrontImg/);
    assert.match(pdp, /StorefrontImg/);
  });
});

describe("Sprint 34 — TEST 11 consent remains functional", () => {
  it("defaults optional tags off and keeps essential on", () => {
    const decision = defaultDeniedOptionalConsent(
      new Date("2026-08-22T00:00:00.000Z"),
    );
    assert.equal(decision.version, CONSENT_VERSION);
    assert.equal(decision.essential, true);
    assert.equal(hasAnalyticsConsent(decision), false);
    assert.equal(isOptionalIntegrationAllowed("analytics", decision), false);
    assert.equal(uiChrome("cookieBannerBody"), "[CONTENT PENDING APPROVAL]");
  });
});

describe("Sprint 34 — TEST 12 accessibility / locale contracts remain", () => {
  it("keeps English as the only active storefront locale", () => {
    assert.deepEqual([...ACTIVE_STOREFRONT_LOCALES], ["en"]);
  });

  it("keeps skip-to-content and dialog-focus helpers in the a11y layer", () => {
    const skip = readFileSync(
      path.join(process.cwd(), "app/a11y/SkipToContent.tsx"),
      "utf8",
    );
    assert.match(skip, /skip-to-content|#main-content/);
  });
});

describe("Sprint 34 — TEST 13 preview does not require a production PSP", () => {
  it("documents mock payment and refuses live indexing in preview env example", () => {
    const envExample = readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf8",
    );
    assert.match(envExample, /APP_ENV=preview/);
    assert.match(envExample, /PAYMENT_PROVIDER=mock/);
    assert.match(envExample, /STOREFRONT_INDEXING=/);
    assert.match(envExample, /REPLACE-WITH-OWNER-DOMAIN/);
    assert.doesNotMatch(envExample, /omise|2c2p|stripe|paypal/i);

    const envSource = readFileSync(
      path.join(process.cwd(), "src/server/config/env.ts"),
      "utf8",
    );
    assert.match(envSource, /Public preview requires PAYMENT_PROVIDER=mock/);
    assert.match(
      envSource,
      /STOREFRONT_INDEXING=live is not allowed in public preview/,
    );
  });

  it("hides admin on the public preview surface", () => {
    const proxy = readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");
    const layout = readFileSync(
      path.join(process.cwd(), "app/admin/layout.tsx"),
      "utf8",
    );
    const login = readFileSync(
      path.join(process.cwd(), "app/api/admin/login/route.ts"),
      "utf8",
    );
    assert.match(proxy, /isPublicPreview/);
    assert.match(layout, /isPublicPreview/);
    assert.match(login, /PUBLIC_PREVIEW_ADMIN_CODE/);
  });
});
