import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import { applyPreviewTestCatalogOverlay } from "@/lib/preview/preview-test-catalog";
import { PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import { PaymentService } from "@/src/server/payment/payment-service";
import { createPaymentProvider } from "@/src/server/payment/factory";
import { vercelPreviewOrigins } from "@/src/server/http/csrf";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import {
  assertOrderAccess,
  extractOrderAccessToken,
} from "@/src/server/orders/order-access-token";
import {
  createMemoryPreviewCookieStore,
  installPreviewCommerceCookieTestStore,
  parsePreviewCommerceSnapshot,
  PREVIEW_COMMERCE_COOKIE_NAME,
  readPreviewOrderAccessToken,
  type PreviewCookieStore,
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

function recordingCookieStore(): {
  store: PreviewCookieStore;
  lastOptions: () =>
    | {
        httpOnly?: boolean;
        sameSite?: "lax" | "strict" | "none";
        path?: string;
        maxAge?: number;
        secure?: boolean;
      }
    | undefined;
} {
  const memory = createMemoryPreviewCookieStore();
  let lastOptions:
    | {
        httpOnly?: boolean;
        sameSite?: "lax" | "strict" | "none";
        path?: string;
        maxAge?: number;
        secure?: boolean;
      }
    | undefined;
  return {
    store: {
      get: (name) => memory.get(name),
      set(name, value, options) {
        lastOptions = options;
        memory.set(name, value, options);
      },
      delete: (name) => memory.delete(name),
    },
    lastOptions: () => lastOptions,
  };
}

async function createPreviewPickupDraft(product: Product) {
  const carts = memoryCartRepo();
  const cartService = new DefaultCartService(carts, singleProductRepo(product));
  const { orders } = previewCommerceRepos();
  const checkout = new DefaultCheckoutService(
    carts,
    singleProductRepo(product),
    new MockBoutiqueRepository(),
    new MockPickupRepository(),
    orders,
  );
  const cart = await cartService.addItem(undefined, {
    productId: product.id,
    quantity: 1,
    modifiers: almondChocolate,
  });
  return checkout.createDraftCheckout(cart.id, {
    termsAccepted: true,
    serviceType: "PICKUP",
    customer: guest,
    pickup: {
      boutiqueId: "boutique-pending",
      dateKey: "2026-08-23",
      pickupSlotId: "1030-1100",
    },
  });
}

describe("Sprint 34F — preview order access token persistence", () => {
  it("stores the checkout token on the httpOnly Preview commerce cookie", async () => {
    const recorded = recordingCookieStore();
    installPreviewCommerceCookieTestStore(recorded.store);
    const product = overlayLdr003();
    try {
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          const draft = await createPreviewPickupDraft(product);
          const raw = recorded.store.get(PREVIEW_COMMERCE_COOKIE_NAME)?.value;
          assert.ok(raw);
          const snapshot = parsePreviewCommerceSnapshot(raw);
          assert.equal(snapshot?.order?.id, draft.orderId);
          assert.equal(snapshot?.accessToken, draft.accessToken);
          assert.equal(
            await readPreviewOrderAccessToken(draft.orderId),
            draft.accessToken,
          );
          const options = recorded.lastOptions();
          assert.equal(options?.httpOnly, true);
          assert.equal(options?.sameSite, "lax");
          assert.equal(options?.path, "/");
          assert.ok((options?.maxAge ?? 0) >= 60 * 60 * 24);
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("recovers the token for Checkout → Payment and Payment reload", async () => {
    const store = createMemoryPreviewCookieStore();
    installPreviewCommerceCookieTestStore(store);
    const product = overlayLdr003();
    try {
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          const draft = await createPreviewPickupDraft(product);
          const checkoutToPayment = new Request(
            `http://localhost/api/orders/${draft.orderId}`,
          );
          assert.equal(extractOrderAccessToken(checkoutToPayment), null);
          await assertOrderAccess(checkoutToPayment, draft.orderId, "order");

          const reloaded = previewCommerceRepos();
          const lookups = new DefaultOrderService(
            reloaded.orders,
            singleProductRepo(product),
            new MockBoutiqueRepository(),
            new MockPickupRepository(),
          );
          const reloadRequest = new Request(
            `http://localhost/api/orders/${draft.orderId}`,
          );
          await assertOrderAccess(reloadRequest, draft.orderId, "order");
          const order = await lookups.getOrderById(draft.orderId);
          assert.equal(order.id, draft.orderId);
          assert.deepEqual(order.items[0]?.modifiers, almondChocolate);

          const payments = new PaymentService(
            reloaded.orders,
            reloaded.payments,
            new MockWebhookEventRepository(),
            "preview-integrity-secret",
            300,
          );
          const created = await payments.createPayment({
            orderId: draft.orderId,
            method: "promptpay-qr",
            accessToken: await payments.resolveAccessToken(
              new Request("http://localhost/api/payment/create"),
              "",
              draft.orderId,
            ),
          });
          assert.match(created.paymentUrl, /^\/payment\/mock\?paymentId=/);
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("keeps the same token after back/forward cookie rewrites", async () => {
    const store = createMemoryPreviewCookieStore();
    installPreviewCommerceCookieTestStore(store);
    const product = overlayLdr003();
    try {
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          const draft = await createPreviewPickupDraft(product);
          const firstToken = await readPreviewOrderAccessToken(draft.orderId);
          assert.equal(firstToken, draft.accessToken);

          const isolated = previewCommerceRepos();
          const restored = await isolated.orders.findById(draft.orderId);
          assert.ok(restored);
          await isolated.orders.updateStatus(draft.orderId, restored.status);

          assert.equal(
            await readPreviewOrderAccessToken(draft.orderId),
            draft.accessToken,
          );
          await assertOrderAccess(
            new Request(`http://localhost/api/orders/${draft.orderId}`),
            draft.orderId,
            "order",
          );
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("maps the cookie token only to its Preview order", async () => {
    const store = createMemoryPreviewCookieStore();
    installPreviewCommerceCookieTestStore(store);
    const product = overlayLdr003();
    try {
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          const draft = await createPreviewPickupDraft(product);
          assert.equal(await readPreviewOrderAccessToken("other-order"), null);
          await assert.rejects(
            () =>
              assertOrderAccess(
                new Request("http://localhost/api/orders/other-order"),
                "other-order",
                "order",
              ),
            (error: unknown) =>
              error instanceof AppError &&
              error.status === 401 &&
              error.message === "Order access token is required.",
          );
          await assertOrderAccess(
            new Request(`http://localhost/api/orders/${draft.orderId}`),
            draft.orderId,
            "order",
          );
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("fails safely when the token and cookie are both missing", async () => {
    installPreviewCommerceCookieTestStore(createMemoryPreviewCookieStore());
    try {
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          await assert.rejects(
            () =>
              assertOrderAccess(
                new Request("http://localhost/api/orders/missing"),
                "missing",
                "order",
              ),
            (error: unknown) =>
              error instanceof AppError &&
              error.message === "Order access token is required.",
          );
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("ignores a leftover cookie when Production or the catalog is off", async () => {
    const store = createMemoryPreviewCookieStore();
    installPreviewCommerceCookieTestStore(store);
    const product = overlayLdr003();
    try {
      let leftover = "";
      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          const draft = await createPreviewPickupDraft(product);
          leftover = store.get(PREVIEW_COMMERCE_COOKIE_NAME)?.value ?? "";
          assert.ok(leftover.includes(draft.orderId));
        },
      );

      await withEnvAsync(
        { APP_ENV: "production", PREVIEW_TEST_CATALOG: "true" },
        async () => {
          assert.equal(await readPreviewOrderAccessToken(), null);
          await assert.rejects(
            () =>
              assertOrderAccess(
                new Request("http://localhost/api/orders/any"),
                "any",
                "order",
              ),
            (error: unknown) =>
              error instanceof AppError &&
              error.message === "Order access token is required.",
          );
        },
      );

      await withEnvAsync(
        { APP_ENV: "preview", PREVIEW_TEST_CATALOG: undefined },
        async () => {
          assert.equal(await readPreviewOrderAccessToken(), null);
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("keeps delivery blocked and does not call a live PSP or Prisma", async () => {
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
    assert.doesNotMatch(
      factories,
      /createPrismaRepositories[\s\S]*PreviewCookieOrderRepository/,
    );
  });

  it("does not put the Preview token into client-visible page props", () => {
    const paymentPage = readFileSync(
      path.join(process.cwd(), "app/payment/page.tsx"),
      "utf8",
    );
    assert.match(paymentPage, /readPreviewPaymentDraftOrderId/);
    assert.match(paymentPage, /accessToken=\{params\.token \?\? null\}/);
    assert.doesNotMatch(paymentPage, /snapshot\?\.accessToken/);

    const client = readFileSync(
      path.join(process.cwd(), "app/payment/PaymentPageClient.tsx"),
      "utf8",
    );
    assert.doesNotMatch(
      client,
      /Order access token is required\. Return to checkout to continue payment/,
    );
    assert.equal(client.includes("localStorage"), false);

    assert.deepEqual(
      vercelPreviewOrigins({
        APP_ENV: "production",
        VERCEL_URL: "laduree-thailand-portal-okvwyy6fc-okgo.vercel.app",
      } as NodeJS.ProcessEnv),
      [],
    );
  });
});
