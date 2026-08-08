import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  issueOrderAccessToken,
  verifyOrderAccessToken,
} from "@/src/server/orders/order-access-token";
import { AppError } from "@/src/server/utils/errors";

describe("Sprint 25 — order access tokens", () => {
  it("issues and verifies a token for the matching order + scope", () => {
    const orderId = "order-abc-123";
    const token = issueOrderAccessToken(orderId);
    const payload = verifyOrderAccessToken(token, orderId, "order");
    assert.equal(payload.oid, orderId);
    assert.ok(payload.scopes.includes("pickup"));
    assert.ok(payload.scopes.includes("history"));
  });

  it("rejects token for a different order id", () => {
    const token = issueOrderAccessToken("order-a");
    assert.throws(
      () => verifyOrderAccessToken(token, "order-b", "order"),
      (error: unknown) =>
        error instanceof AppError && error.code === "FORBIDDEN",
    );
  });

  it("rejects tampered tokens", () => {
    const token = issueOrderAccessToken("order-a");
    const tampered = `${token.slice(0, -4)}xxxx`;
    assert.throws(
      () => verifyOrderAccessToken(tampered, "order-a", "order"),
      (error: unknown) =>
        error instanceof AppError && error.code === "UNAUTHORIZED",
    );
  });

  it("rejects expired tokens", () => {
    const orderId = "order-exp";
    const token = issueOrderAccessToken(orderId, {
      ttlSeconds: 10,
      nowSeconds: 1_000,
    });
    assert.throws(
      () =>
        verifyOrderAccessToken(token, orderId, "order", {
          nowSeconds: 1_020,
        }),
      (error: unknown) =>
        error instanceof AppError && error.code === "UNAUTHORIZED",
    );
  });
});
