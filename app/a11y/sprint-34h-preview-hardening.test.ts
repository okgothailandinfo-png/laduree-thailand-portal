import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import { applyPreviewTestCatalogOverlay } from "@/lib/preview/preview-test-catalog";
import { PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import { buildOrderConfirmationPath } from "@/lib/orders/post-payment-session";
import { PaymentService } from "@/src/server/payment/payment-service";
import { EnvValidationError, resolveDataSource } from "@/src/server/config/env";
import type { Cart } from "@/src/server/models/cart";
import type { Product } from "@/src/server/models/product";
import {
  assertOrderAccess,
  extractOrderAccessToken,
} from "@/src/server/orders/order-access-token";
import {
  createMemoryPreviewCookieStore,
  installPreviewCommerceCookieTestStore,
  isPreviewPaymentDraftRecoverable,
  parsePreviewCommerceSnapshot,
  readPreviewConfirmationOrderId,
  readPreviewOrderAccessToken,
  readPreviewPaymentDraftOrderId,
} from "@/src/server/preview/preview-commerce-cookie";
import { PreviewCookieOrderRepository } from "@/src/server/preview/preview-order-repository";
import { PreviewCookiePaymentRepository } from "@/src/server/preview/preview-payment-repository";
import type {
  CartRepository,
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
import {
  assertPublicPreviewCartMutationsAllowed,
  assertPublicPreviewCheckoutPaymentAllowed,
} from "@/src/server/preview/commerce-guard";

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

function previewCommerceRepos() {
  const orders = new PreviewCookieOrderRepository(new MockOrderRepository());
  const payments = new PreviewCookiePaymentRepository(
    new MockPaymentRepository(),
  );
  return { orders, payments };
}

function cookieTokenRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("Sprint 34H — preview residual hardening", () => {
  it("recovers mock payment and confirmation from the httpOnly cookie without a URL token", async () => {
    const store = createMemoryPreviewCookieStore();
    installPreviewCommerceCookieTestStore(store);
    const product = overlayLdr003();
    const carts = memoryCartRepo();

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
            new MockBoutiqueRepository(),
            new MockPickupRepository(),
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

          const cookieToken = await readPreviewOrderAccessToken(draft.orderId);
          assert.ok(cookieToken);
          assert.equal(extractOrderAccessToken(cookieTokenRequest("https://ok-go.cloud/payment/mock?paymentId=pay-1")), null);

          const isolated = previewCommerceRepos();
          await assertOrderAccess(
            cookieTokenRequest("https://ok-go.cloud/payment/mock?paymentId=pay-1"),
            draft.orderId,
            "order",
          );

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
            accessToken: cookieToken,
          });

          const afterPay = previewCommerceRepos();
          const confirmService = new PaymentService(
            afterPay.orders,
            afterPay.payments,
            new MockWebhookEventRepository(),
            "preview-integrity-secret",
            300,
          );
          const cookieOnlyToken = await readPreviewOrderAccessToken(
            draft.orderId,
          );
          assert.ok(cookieOnlyToken);
          const confirmed = await confirmService.confirmPayment(
            created.paymentId,
            "SUCCESS",
            cookieOnlyToken,
          );
          assert.equal(confirmed.status, "SUCCESS");

          assert.equal(await readPreviewPaymentDraftOrderId(), null);
          assert.equal(await readPreviewConfirmationOrderId(), draft.orderId);
          assert.ok(await readPreviewOrderAccessToken(draft.orderId));

          const confirmation = previewCommerceRepos();
          await assertOrderAccess(
            cookieTokenRequest(
              `https://ok-go.cloud/order-confirmation?orderId=${draft.orderId}`,
            ),
            draft.orderId,
            "order",
          );
          const lookups = new DefaultOrderService(
            confirmation.orders,
            singleProductRepo(product),
            new MockBoutiqueRepository(),
            new MockPickupRepository(),
          );
          const order = await lookups.getOrderById(draft.orderId);
          assert.equal(order.status, "confirmed");
          assert.equal(
            buildOrderConfirmationPath({ orderId: draft.orderId }),
            `/order-confirmation?orderId=${draft.orderId}`,
          );
        },
      );
    } finally {
      installPreviewCommerceCookieTestStore(null);
    }
  });

  it("does not reopen a paid Preview draft on a bare /payment visit", async () => {
    const unpaid = parsePreviewCommerceSnapshot(
      JSON.stringify({
        order: {
          id: "order-paid",
          orderNumber: "LD-TH-TEST",
          status: "confirmed",
          serviceType: "PICKUP",
          currency: "THB",
          createdAt: new Date().toISOString(),
          items: [],
          customer: {
            customerName: "Ada Lovelace",
            mobileNumber: "+66812345678",
            email: "ada@example.com",
          },
          totalMinor: 100,
          payment: { method: "promptpay-qr", methodLabel: "PromptPay QR", status: "mock_accepted" },
        },
        payment: {
          paymentId: "pay-1",
          orderId: "order-paid",
          status: "SUCCESS",
          paymentUrl: "/payment/mock?paymentId=pay-1",
          method: "promptpay-qr",
          methodLabel: "PromptPay QR",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: "payload.signature",
        paymentClosed: true,
      }),
    );
    assert.equal(isPreviewPaymentDraftRecoverable(unpaid), false);

    const pending = parsePreviewCommerceSnapshot(
      JSON.stringify({
        order: {
          id: "order-open",
          orderNumber: "DRAFT-1",
          status: "pending",
          serviceType: "PICKUP",
          currency: "THB",
          createdAt: new Date().toISOString(),
          items: [],
          customer: {
            customerName: "Ada Lovelace",
            mobileNumber: "+66812345678",
            email: "ada@example.com",
          },
          totalMinor: 100,
        },
        payment: null,
        accessToken: "payload.signature",
      }),
    );
    assert.equal(isPreviewPaymentDraftRecoverable(pending), true);
  });

  it("refuses DATA_SOURCE=prisma for Preview mock commerce and leaves Production unchanged", () => {
    assert.throws(
      () =>
        resolveDataSource({
          nodeEnv: "production",
          appEnv: "preview",
          dataSource: "prisma",
          databaseUrl: "postgres://preview",
          buildPhase: false,
        }),
      (error: unknown) =>
        error instanceof EnvValidationError &&
        /DATA_SOURCE=prisma is not allowed in public preview/.test(error.message),
    );
    assert.equal(
      resolveDataSource({
        nodeEnv: "production",
        appEnv: "production",
        dataSource: "prisma",
        databaseUrl: "postgres://prod",
        buildPhase: false,
      }),
      "prisma",
    );
    assert.throws(
      () =>
        assertPublicPreviewCheckoutPaymentAllowed("preview", {
          APP_ENV: "preview",
          PREVIEW_TEST_CATALOG: "true",
          DATA_SOURCE: "prisma",
        } as NodeJS.ProcessEnv),
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
    assert.doesNotThrow(() =>
      assertPublicPreviewCartMutationsAllowed("production", {
        APP_ENV: "production",
        PREVIEW_TEST_CATALOG: "true",
        DATA_SOURCE: "prisma",
      } as NodeJS.ProcessEnv),
    );

    const factories = readFileSync(
      path.join(process.cwd(), "src/server/repositories/create-repositories.ts"),
      "utf8",
    );
    assert.match(factories, /isPublicPreview\(\) && source === "prisma"/);
  });

  it("clears mobile VIEW CART bar space under checkout, payment, mock, and confirmation CTAs", () => {
    const clearance = /--view-cart-bar-clearance[\s\S]*safe-area-inset-bottom/;
    const checkout = readFileSync(
      path.join(process.cwd(), "app/checkout/checkout.css"),
      "utf8",
    );
    const payment = readFileSync(
      path.join(process.cwd(), "app/payment/payment.css"),
      "utf8",
    );
    const confirmation = readFileSync(
      path.join(process.cwd(), "app/order-confirmation/order-confirmation.css"),
      "utf8",
    );
    const completed = readFileSync(
      path.join(process.cwd(), "app/order-completed/order-completed.css"),
      "utf8",
    );
    assert.match(checkout, /@media \(max-width: 991px\)[\s\S]*checkout-page__inner[\s\S]*view-cart-bar-clearance/);
    assert.match(payment, /@media \(max-width: 991px\)[\s\S]*payment-page__inner[\s\S]*view-cart-bar-clearance/);
    assert.match(confirmation, /@media \(max-width: 991px\)[\s\S]*order-confirmation-page__inner[\s\S]*view-cart-bar-clearance/);
    assert.match(completed, /@media \(max-width: 991px\)[\s\S]*order-receipt-page__inner[\s\S]*view-cart-bar-clearance/);
    assert.match(checkout, clearance);
    assert.match(payment, clearance);
  });

  it("does not hard-gate mock payment or confirmation on a client-visible token", () => {
    const mockPage = readFileSync(
      path.join(process.cwd(), "app/payment/mock/MockPaymentPageClient.tsx"),
      "utf8",
    );
    assert.doesNotMatch(mockPage, /missingAccessToken/);
    assert.doesNotMatch(
      mockPage,
      /if \(!paymentId \|\| !loadToken\) return/,
    );
    assert.match(mockPage, /buildOrderConfirmationPath\(\{\s*orderId: payment\.orderId,\s*\}\)/);

    const confirmation = readFileSync(
      path.join(process.cwd(), "app/order-confirmation/OrderConfirmationClient.tsx"),
      "utf8",
    );
    assert.doesNotMatch(
      confirmation,
      /if \(!resolvedAccessToken\) \{\s*return Promise\.reject/,
    );
    assert.match(confirmation, /confirmation-token-required/);

    const confirmationPage = readFileSync(
      path.join(process.cwd(), "app/order-confirmation/page.tsx"),
      "utf8",
    );
    assert.match(confirmationPage, /readPreviewConfirmationOrderId/);
    assert.doesNotMatch(confirmationPage, /snapshot\?\.accessToken/);

    const checkout = readFileSync(
      path.join(process.cwd(), "app/checkout/CheckoutPageClient.tsx"),
      "utf8",
    );
    assert.match(
      checkout,
      /`\/payment\?orderId=\$\{encodeURIComponent\(result\.orderId\)\}`/,
    );
    assert.doesNotMatch(
      checkout,
      /\/payment\?orderId=.*&token=\$\{encodeURIComponent\(result\.accessToken\)\}/,
    );
  });
});
