import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertCsrfOrigin } from "@/src/server/http/csrf";
import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

describe("Sprint 30 — CSRF origin checks", () => {
  it("allows GET without Origin", () => {
    const request = new Request("http://localhost:3000/api/cart", {
      method: "GET",
    });
    assert.doesNotThrow(() => assertCsrfOrigin(request));
  });

  it("allows same-origin mutations in development/test without Origin", () => {
    assert.ok(
      env.appEnv === "development" || env.appEnv === "test",
      "csrf missing-origin allowance is for development/test only",
    );
    const request = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
    });
    assert.doesNotThrow(() => assertCsrfOrigin(request));
  });

  it("rejects disallowed Origin on mutating requests", () => {
    const request = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    assert.throws(
      () => assertCsrfOrigin(request),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "FORBIDDEN" &&
        error.message.includes("origin"),
    );
  });

  it("accepts allowed localhost Origin", () => {
    const request = new Request("http://localhost:3000/api/cart/items", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    assert.doesNotThrow(() => assertCsrfOrigin(request));
  });

  it("rejects disallowed Referer when Origin is absent", () => {
    // Force staging-like strictness by only sending a bad referer — in
    // development missing Origin is allowed, so provide an explicit bad referer
    // which is always validated when present.
    const request = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { referer: "https://evil.example/attack" },
    });
    assert.throws(
      () => assertCsrfOrigin(request),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "FORBIDDEN" &&
        /referer/i.test(error.message),
    );
  });
});
