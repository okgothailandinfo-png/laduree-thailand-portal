import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  EnvValidationError,
  assertVercelAppEnvExplicit,
} from "@/src/server/config/env";
import { isStorefrontIndexingLive } from "@/lib/seo/indexing";
import { evaluateProductPurchasability } from "@/lib/catalog/product-purchasability";
import { buildThailandCatalog } from "@/lib/catalog/thailand-product-import";
import { ACTIVE_STOREFRONT_LOCALES } from "@/lib/i18n/locale";

describe("Sprint 34B — Vercel Public Preview", () => {
  it("requires explicit APP_ENV on Vercel at runtime", () => {
    assert.throws(
      () =>
        assertVercelAppEnvExplicit(
          { VERCEL: "1" } as NodeJS.ProcessEnv,
          false,
        ),
      (error: unknown) =>
        error instanceof EnvValidationError &&
        error.message.includes("APP_ENV"),
    );
    assert.doesNotThrow(() =>
      assertVercelAppEnvExplicit(
        { VERCEL: "1", APP_ENV: "preview" } as NodeJS.ProcessEnv,
        false,
      ),
    );
    assert.doesNotThrow(() =>
      assertVercelAppEnvExplicit(
        { VERCEL: "1" } as NodeJS.ProcessEnv,
        true,
      ),
    );
    assert.doesNotThrow(() =>
      assertVercelAppEnvExplicit({} as NodeJS.ProcessEnv, false),
    );
  });

  it("does not treat Vercel Production as live indexing", () => {
    assert.equal(
      isStorefrontIndexingLive({
        APP_ENV: "preview",
        STOREFRONT_INDEXING: "live",
      }),
      false,
    );
    assert.equal(
      isStorefrontIndexingLive({
        APP_ENV: "preview",
        STOREFRONT_INDEXING: "off",
      }),
      false,
    );
  });

  it("keeps LDR001–LDR038 non-purchasable for Vercel mock catalog", () => {
    const catalog = buildThailandCatalog();
    assert.equal(catalog.products.length, 38);
    assert.ok(
      catalog.products.every(
        (product) => evaluateProductPurchasability(product).purchasable === false,
      ),
    );
  });

  it("keeps English as the only active storefront locale", () => {
    assert.deepEqual([...ACTIVE_STOREFRONT_LOCALES], ["en"]);
  });

  it("configures Vercel Next.js build with Prisma generate and www→apex", () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      framework: string;
      buildCommand: string;
      installCommand: string;
      redirects: Array<{
        destination: string;
        has?: Array<{ value?: string }>;
      }>;
    };
    assert.equal(vercel.framework, "nextjs");
    assert.match(vercel.buildCommand, /prisma generate/);
    assert.match(vercel.buildCommand, /next build/);
    assert.equal(vercel.installCommand, "npm ci");
    assert.ok(
      vercel.redirects.some(
        (redirect) =>
          redirect.destination === "https://ok-go.cloud/:path*" &&
          redirect.has?.some((rule) => rule.value === "www.ok-go.cloud"),
      ),
    );

    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    assert.match(pkg.scripts.build, /prisma generate/);
    assert.match(pkg.scripts.postinstall, /prisma generate/);

    const envExample = readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf8",
    );
    assert.match(envExample, /APP_BASE_URL=https:\/\/ok-go\.cloud/);
    assert.match(envExample, /DATA_SOURCE=mock/);
    assert.match(envExample, /PAYMENT_PROVIDER=mock/);
    assert.doesNotMatch(envExample, /omise|2c2p|stripe|paypal/i);
  });
});
