import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderCompletedPath,
  buildOrderConfirmationPath,
  buildOrderReceiptPath,
} from "@/lib/orders/post-payment-session";
import {
  issueOrderAccessToken,
  verifyOrderAccessToken,
} from "@/src/server/orders/order-access-token";

describe("Sprint 25 — post-payment reopen paths", () => {
  it("builds confirmation/history reopen URLs with orderId + token", () => {
    const orderId = "order-123";
    const token = issueOrderAccessToken(orderId);
    const confirmation = buildOrderConfirmationPath({ orderId, accessToken: token });
    const completed = buildOrderCompletedPath({ orderId, accessToken: token });
    const receipt = buildOrderReceiptPath({ orderId, accessToken: token });

    assert.match(confirmation, /^\/order-confirmation\?orderId=order-123&token=/);
    assert.match(completed, /^\/order-completed\/order-123\?token=/);
    assert.match(receipt, /^\/order-completed\/order-123\/receipt\?token=/);

    const encoded = new URL(confirmation, "https://example.test");
    verifyOrderAccessToken(
      decodeURIComponent(encoded.searchParams.get("token") ?? ""),
      orderId,
      "order",
    );
  });

  it("omits the token query when none is supplied", () => {
    assert.equal(
      buildOrderConfirmationPath({ orderId: "order-123" }),
      "/order-confirmation?orderId=order-123",
    );
    assert.equal(
      buildOrderCompletedPath({ orderId: "order-123" }),
      "/order-completed/order-123",
    );
    assert.equal(
      buildOrderReceiptPath({ orderId: "order-123" }),
      "/order-completed/order-123/receipt",
    );
  });
});
