import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendAccessTokenToUrl } from "@/src/server/orders/append-access-token";

describe("appendAccessTokenToUrl", () => {
  it("appends token to relative mock payment urls only", () => {
    assert.match(
      appendAccessTokenToUrl("/payment/mock?paymentId=abc", "tok.en"),
      /token=tok\.en/,
    );
    assert.equal(
      appendAccessTokenToUrl("https://psp.example/pay", "tok.en"),
      "https://psp.example/pay",
    );
  });
});
