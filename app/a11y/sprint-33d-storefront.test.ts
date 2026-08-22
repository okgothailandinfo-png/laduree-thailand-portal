import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { MockProductRepository } from "../../src/server/repositories/mock/product.repository";
import { MOCK_PRODUCTS } from "../../src/server/repositories/mock/data";
import { DefaultProductService } from "../../src/server/services/product.service";
import { evaluateProductPurchasability } from "../../lib/catalog/product-purchasability";
import robots from "../robots";

describe("Sprint 33D — chrome and release UX contracts", () => {
  it("reuses shared header/footer chrome on storefront frames", () => {
    const chrome = readFileSync(
      path.join(process.cwd(), "app/chrome/StorefrontChrome.tsx"),
      "utf8",
    );
    const checkout = readFileSync(
      path.join(process.cwd(), "app/checkout/page.tsx"),
      "utf8",
    );
    assert.match(chrome, /SiteHeader/);
    assert.match(chrome, /SiteFooter/);
    assert.match(checkout, /StorefrontChrome/);
  });

  it("shows Singapore Unavailable wording on cards and PDP", () => {
    const card = readFileSync(
      path.join(process.cwd(), "app/chrome/ProductCard.tsx"),
      "utf8",
    );
    const pdp = readFileSync(
      path.join(process.cwd(), "app/product/[slug]/ProductDetailClient.tsx"),
      "utf8",
    );
    assert.match(card, /Unavailable/);
    assert.match(pdp, /This product is unavailable at this time\./);
  });

  it("category rail uses a button control", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/HomePageClient.tsx"),
      "utf8",
    );
    assert.match(page, /floating-category-link/);
    assert.match(page, /<button/);
  });

  it("search remains a disabled pending control", () => {
    const header = readFileSync(
      path.join(process.cwd(), "app/chrome/SiteHeader.tsx"),
      "utf8",
    );
    assert.match(header, /placeholder=\"Search items\"/);
    assert.match(header, /disabled/);
  });
});

describe("Sprint 33D — SEO fail-closed", () => {
  it("robots disallow all paths until live indexing is authorized", () => {
    const previousApp = process.env.APP_ENV;
    const previousIndexing = process.env.STOREFRONT_INDEXING;
    delete process.env.STOREFRONT_INDEXING;
    process.env.APP_ENV = "production";
    try {
      const result = robots();
      const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
      assert.equal(rules?.disallow, "/");
    } finally {
      if (previousApp === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previousApp;
      if (previousIndexing === undefined) {
        delete process.env.STOREFRONT_INDEXING;
      } else {
        process.env.STOREFRONT_INDEXING = previousIndexing;
      }
    }
  });

  it("production slug lookup hides all current Thailand Draft SKUs", async () => {
    const previous = process.env.APP_ENV;
    process.env.APP_ENV = "production";
    try {
      const repo = new MockProductRepository();
      assert.equal((await repo.list()).length, 0);
      for (const product of MOCK_PRODUCTS) {
        assert.equal(await repo.findBySlug(product.slug), null);
        const purchasability = evaluateProductPurchasability(product);
        assert.equal(purchasability.purchasable, false);
      }
      assert.equal(MOCK_PRODUCTS.length, 38);
    } finally {
      if (previous === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previous;
    }
  });

  it("indexable product list is empty while Safe-Draft", async () => {
    const service = new DefaultProductService(new MockProductRepository());
    const indexable = await service.listIndexableProducts();
    assert.deepEqual(indexable, []);
  });
});

describe("Sprint 33D — consent architecture", () => {
  it("does not invent Thailand legal policy copy", () => {
    const chrome = readFileSync(
      path.join(process.cwd(), "lib/i18n/ui-chrome.ts"),
      "utf8",
    );
    const banner = readFileSync(
      path.join(process.cwd(), "app/consent/CookieConsentBanner.tsx"),
      "utf8",
    );
    assert.match(chrome, /cookieBannerBody: \"\[CONTENT PENDING APPROVAL\]\"/);
    assert.match(banner, /cookieBannerBody/);
    assert.equal(banner.includes("Privacy Policy"), false);
  });
});
