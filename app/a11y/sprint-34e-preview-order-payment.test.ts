import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import { buildOrderConfirmationPath } from "@/lib/orders/post-payment-session";
import { applyPreviewTestCatalogOverlay } from "@/lib/preview/preview-test-catalog";
import { PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import { PaymentService } from "@/src/server/payment/payment-service";
import { createPaymentProvider } from "@/src/server/payment/factory";
import { assertMockPaymentMutationsAllowed } from "@/src/server/payment/production-guard";
import { vercelPreviewOrigins } from "@/src/server/http/csrf";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import {
  createMemoryPreviewCookieStore,
  installPreviewCommerceCookieTestStore,
} from "@/src/server/preview/preview-commerce-cookie";
import { PreviewCookieOrderRepository } from "@/src/server/preview/preview-order-repository";
import { PreviewCookiePaymentRepository } from "@/src/server/preview/preview-payment-repository";
import type {
  BoutiqueRepository,
  CartRepository,
  OrderRepository,
  PickupRepository,
  ProductRepository,
} from "@/src/server/repositories/interfaces";
import { MockBoutiqueRepository } from "@/src/server/repositories/mock/boutique.repository";
import { MockOrderRepository } from "@/src/server/repositories/mock/order.repository";
import { MockPaymentRepository } from "@/src/server/repositories/mock/payment.repository";
import { MockPickupRepository } from "@/src/server/repositories/mock/pickup.repository";
import { MockWebhookEventRepository } from "@/src/server/repositories/mock/webhook-event.repository";
import { DefaultCartService } from "@/src/server/services/cart.service";
import { DefaultCheckoutService } from "@/src/server/services/checkout.service";
import { DefaultOrderService } from "@/src/server/services/order.service";
import { AppError } from "@/src/server/utils/errors";

const almondChocolate = [
  { label: "Almond", quantity: 4 },
  { label: "Chocolate", quantity: 4 },
];

const guest = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+66812345678",
};

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

function isPreviewCommerceError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    error.status === 403 &&
    Boolean(
      error.details &&
        typeof error.details === "object" &&
        (error.details as { code?: string }).code ===
          PUBLIC_PREVIEW_COMMERCE_CODE,
    )
  );
}

function previewCommerceRepos() {
  const orders = new PreviewCookieOrderRepository(new MockOrderRepository());
  const payments = new PreviewCookiePaymentRepository(
    new MockPaymentRepository(),
  );
  return { orders, payments };
}

describe("Sprint 34E — preview PICKUP order / mock payment", () => {
  it("blocks checkout and payment when the test catalog is off", async () => {
    const product = overlayLdr003();
    const carts = memoryCartRepo();
    await withEnvAsync(
      { APP_ENV: "preview", PREVIEW_TEST_CATALOG: undefined },
      async () => {
        const checkout = new DefaultCheckoutService(
          carts,
          singleProductRepo(product),
          unusedBoutiqueRepo(),
          unusedPickupRepo(),
          unusedOrderRepo(),
        );
        await assert.rejects(
          () =>
            checkout.createDraftCheckout("cart-1", {
              termsAccepted: true,
              serviceType: "PICKUP",
              customer: guest,
              pickup: {
                boutiqueId: "boutique-pending",
                dateKey: "2026-08-23",
                pickupSlotId: "1030-1100",
              },
            }),
          isPreviewCommerceError,
        );
        const payments = new PaymentService(
          unusedOrderRepo(),
          new MockPaymentRepository(),
          new MockWebhookEventRepository(),
          "preview-integrity-secret",
          300,
        );
        await assert.rejects(
          () =>
            payments.createPayment({
              orderId: "order-1",
              method: "promptpay-qr",
              accessToken: "token",
            }),
          isPreviewCommerceError,
        );
        assert.throws(() => assertMockPaymentMutationsAllowed(), isPreviewCommerceError);
      },
    );
  });

  it("creates a PICKUP draft, preserves flavors, and reaches mock confirmation", async () => {
    const store = createMemoryPreviewCookieStore();
    installPreviewCommerceCookieTestStore(store);
    const product = overlayLdr003();
    const carts = memoryCartRepo();
    const boutique = new MockBoutiqueRepository();
    const pickup = new MockPickupRepository();

    try {
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          const cartService = new DefaultCartService(
            carts,
            singleProductRepo(product),
          );
          const first = previewCommerceRepos();
          const checkout = new DefaultCheckoutService(
            carts,
            singleProductRepo(product),
            boutique,
            pickup,
            first.orders,
          );
          const cart = await cartService.addItem(undefined, {
            productId: product.id,
            quantity: 1,
            modifiers: almondChocolate,
          });
          const draft = await checkout.createDraftCheckout(cart.id, {
            termsAccepted: true,
            serviceType: "PICKUP",
            customer: guest,
            pickup: {
              boutiqueId: "boutique-pending",
              dateKey: "2026-08-23",
              pickupSlotId: "1030-1100",
            },
          });
          assert.equal(draft.itemCount, 1);
          assert.equal(draft.serviceType, "PICKUP");
          assert.ok(draft.accessToken);

          const isolated = previewCommerceRepos();
          const restored = await isolated.orders.findById(draft.orderId);
          assert.ok(restored);
          assert.deepEqual(restored.items[0]?.modifiers, almondChocolate);
          assert.equal(restored.items[0]?.quantity, 1);

          const paymentService = new PaymentService(
            isolated.orders,
            isolated.payments,
            new MockWebhookEventRepository(),
            "preview-integrity-secret",
            300,
          );
          const created = await paymentService.createPayment({
            orderId: draft.orderId,
            method: "promptpay-qr",
            accessToken: draft.accessToken,
          });
          assert.match(created.paymentUrl, /^\/payment\/mock\?paymentId=/);
          assert.equal(created.status, "PENDING");

          assert.doesNotThrow(() => assertMockPaymentMutationsAllowed());

          const afterPay = previewCommerceRepos();
          const confirmService = new PaymentService(
            afterPay.orders,
            afterPay.payments,
            new MockWebhookEventRepository(),
            "preview-integrity-secret",
            300,
          );
          const confirmed = await confirmService.confirmPayment(
            created.paymentId,
            "SUCCESS",
            draft.accessToken,
          );
          assert.equal(confirmed.status, "SUCCESS");
          assert.equal(confirmed.orderStatus, "confirmed");

          const confirmation = previewCommerceRepos();
          const lookups = new DefaultOrderService(
            confirmation.orders,
            singleProductRepo(product),
            boutique,
            pickup,
          );
          const order = await lookups.getOrderById(draft.orderId);
          assert.equal(order.status, "confirmed");
          assert.equal(order.payment?.status, "mock_accepted");
          assert.deepEqual(order.items[0]?.modifiers, almondChocolate);
          const confirmationPath = buildOrderConfirmationPath({
            orderId: draft.orderId,
            accessToken: draft.accessToken,
          });
          assert.match(confirmationPath, /^\/order-confirmation\?orderId=/);
          assert.match(confirmationPath, /token=/);
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("keeps delivery blocked and Production fail-closed", async () => {
    const product = overlayLdr003();
    const carts = memoryCartRepo();
    await withEnvAsync(
      { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
      async () => {
        const cartService = new DefaultCartService(
          carts,
          singleProductRepo(product),
        );
        const cart = await cartService.addItem(undefined, {
          productId: product.id,
          quantity: 1,
          modifiers: almondChocolate,
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
              customer: guest,
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

    const raw = buildThailandCatalog().products.find(
      (item) => item.sku === "LDR003",
    );
    assert.ok(raw);
    await withEnvAsync(
      { APP_ENV: "production", PREVIEW_TEST_CATALOG: "true" },
      async () => {
        const productionProduct = applyPreviewTestCatalogOverlay(raw, {
          APP_ENV: "production",
          PREVIEW_TEST_CATALOG: "true",
        } as NodeJS.ProcessEnv);
        const productionCarts = memoryCartRepo();
        const cartService = new DefaultCartService(
          productionCarts,
          singleProductRepo(productionProduct),
        );
        await assert.rejects(
          () =>
            cartService.addItem(undefined, {
              productId: productionProduct.id,
              quantity: 1,
              modifiers: almondChocolate,
            }),
          (error: unknown) => error instanceof AppError,
        );
      },
    );
  });

  it("does not call a live PSP and does not wire Prisma on the mock path", async () => {
    const payments = new MockPaymentRepository();
    const provider = createPaymentProvider(payments, "mock");
    assert.equal(provider.constructor.name, "MockPaymentProvider");
    const external = createPaymentProvider(payments, "external");
    await assert.rejects(
      () =>
        external.createPayment({
          orderId: "order-1",
          method: "promptpay-qr",
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "PROVIDER_UNAVAILABLE",
    );
    const factories = readFileSync(
      path.join(process.cwd(), "src/server/repositories/create-repositories.ts"),
      "utf8",
    );
    assert.match(factories, /PreviewCookieOrderRepository\(new MockOrderRepository/);
    assert.match(
      factories,
      /PreviewCookiePaymentRepository\(new MockPaymentRepository/,
    );
    assert.match(factories, /orders: new PrismaOrderRepository\(\)/);
    assert.doesNotMatch(
      factories,
      /createPrismaRepositories[\s\S]*PreviewCookieOrderRepository/,
    );
  });

  it("leaves non-preview CSRF host rules unchanged", () => {
    assert.deepEqual(
      vercelPreviewOrigins({
        APP_ENV: "production",
        VERCEL_URL: "laduree-thailand-portal-okvwyy6fc-okgo.vercel.app",
      } as NodeJS.ProcessEnv),
      [],
    );
    const csrf = readFileSync(
      path.join(process.cwd(), "src/server/http/csrf.ts"),
      "utf8",
    );
    assert.match(csrf, /function vercelPreviewOrigins/);
    assert.match(csrf, /isPublicPreview\(processEnv\.APP_ENV\)/);
  });
});
