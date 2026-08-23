import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import {
  assertPublicPreviewCartMutationsAllowed,
  assertPublicPreviewCheckoutPaymentAllowed,
  assertPublicPreviewCommerceAllowed,
} from "@/src/server/preview/commerce-guard";
import { AppError } from "@/src/server/utils/errors";

describe("Sprint 34 — commerce guard", () => {
  it("allows non-preview environments", () => {
    assert.doesNotThrow(() =>
      assertPublicPreviewCommerceAllowed("development"),
    );
    assert.doesNotThrow(() =>
      assertPublicPreviewCommerceAllowed("staging"),
    );
    assert.doesNotThrow(() =>
      assertPublicPreviewCommerceAllowed("test"),
    );
    assert.doesNotThrow(() =>
      assertPublicPreviewCommerceAllowed(undefined),
    );
  });

  it("allows preview cart mutations only when PREVIEW_TEST_CATALOG is on", () => {
    assert.throws(
      () => assertPublicPreviewCartMutationsAllowed("preview"),
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
      assertPublicPreviewCartMutationsAllowed("preview", {
        APP_ENV: "preview",
        PREVIEW_TEST_CATALOG: "true",
      } as NodeJS.ProcessEnv),
    );
    assert.throws(
      () => assertPublicPreviewCommerceAllowed("preview"),
      (error: unknown) =>
        error instanceof AppError && error.status === 403,
    );
  });

  it("allows preview PICKUP checkout/payment only when PREVIEW_TEST_CATALOG is on", () => {
    assert.throws(
      () => assertPublicPreviewCheckoutPaymentAllowed("preview"),
      (error: unknown) =>
        error instanceof AppError && error.status === 403,
    );
    assert.doesNotThrow(() =>
      assertPublicPreviewCheckoutPaymentAllowed("preview", {
        APP_ENV: "preview",
        PREVIEW_TEST_CATALOG: "true",
      } as NodeJS.ProcessEnv),
    );
    assert.doesNotThrow(() =>
      assertPublicPreviewCheckoutPaymentAllowed("production", {
        APP_ENV: "production",
        PREVIEW_TEST_CATALOG: "true",
      } as NodeJS.ProcessEnv),
    );
    assert.throws(
      () => assertPublicPreviewCommerceAllowed("preview"),
      (error: unknown) =>
        error instanceof AppError && error.status === 403,
    );
  });

  it("forbids commerce mutations in public preview", () => {
    assert.throws(
      () => assertPublicPreviewCommerceAllowed("preview"),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "FORBIDDEN" &&
        error.status === 403 &&
        Boolean(
          error.details &&
            typeof error.details === "object" &&
            (error.details as { code?: string }).code ===
              PUBLIC_PREVIEW_COMMERCE_CODE,
        ),
    );
  });
});
