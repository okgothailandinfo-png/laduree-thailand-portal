import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NOINDEX_ROBOTS,
  TRANSACTIONAL_ROBOTS_DISALLOW,
  defaultStorefrontRobots,
  getMetadataBaseUrl,
  isStorefrontIndexingLive,
} from "./indexing";
import { productPageMetadata, transactionalPageMetadata } from "./metadata";

describe("Sprint 33D — storefront indexing policy", () => {
  it("is fail-closed unless production AND STOREFRONT_INDEXING=live", () => {
    assert.equal(isStorefrontIndexingLive({}), false);
    assert.equal(
      isStorefrontIndexingLive({ APP_ENV: "production" }),
      false,
    );
    assert.equal(
      isStorefrontIndexingLive({
        APP_ENV: "staging",
        STOREFRONT_INDEXING: "live",
      }),
      false,
    );
    assert.equal(
      isStorefrontIndexingLive({
        APP_ENV: "production",
        STOREFRONT_INDEXING: "live",
      }),
      true,
    );
  });

  it("defaults robots to noindex", () => {
    assert.deepEqual(defaultStorefrontRobots({}), NOINDEX_ROBOTS);
    assert.deepEqual(
      defaultStorefrontRobots({
        APP_ENV: "production",
        STOREFRONT_INDEXING: "live",
      }),
      { index: true, follow: true },
    );
  });

  it("strips trailing slash on metadata base URL", () => {
    const previous = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://example.test/";
    try {
      assert.equal(getMetadataBaseUrl(), "https://example.test");
    } finally {
      if (previous === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previous;
    }
  });

  it("disallows transactional paths when live indexing is on", () => {
    assert.ok(TRANSACTIONAL_ROBOTS_DISALLOW.includes("/admin"));
    assert.ok(TRANSACTIONAL_ROBOTS_DISALLOW.includes("/checkout"));
    assert.ok(TRANSACTIONAL_ROBOTS_DISALLOW.includes("/payment"));
    assert.ok(TRANSACTIONAL_ROBOTS_DISALLOW.includes("/api"));
  });

  it("marks draft product metadata noindex even if indexing is live", () => {
    const previousApp = process.env.APP_ENV;
    const previousIndexing = process.env.STOREFRONT_INDEXING;
    process.env.APP_ENV = "production";
    process.env.STOREFRONT_INDEXING = "live";
    try {
      const meta = productPageMetadata({
        title: "Draft SKU",
        slug: "draft-sku-ldr001",
        description: "An elegant gold Napoléon gift box.",
        indexable: false,
      });
      assert.deepEqual(meta.robots, NOINDEX_ROBOTS);
    } finally {
      if (previousApp === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previousApp;
      if (previousIndexing === undefined) delete process.env.STOREFRONT_INDEXING;
      else process.env.STOREFRONT_INDEXING = previousIndexing;
    }
  });

  it("transactional pages always noindex", () => {
    const meta = transactionalPageMetadata("Checkout");
    assert.equal(meta.title, "Checkout");
    assert.deepEqual(meta.robots, NOINDEX_ROBOTS);
  });
});
