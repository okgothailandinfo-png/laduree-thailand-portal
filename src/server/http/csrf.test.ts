import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCsrfOrigin,
  vercelPreviewOrigins,
} from "@/src/server/http/csrf";
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

  it("accepts the current Vercel Preview Origin on mutating requests", () => {
    const previousEnv = process.env.APP_ENV;
    const previousUrl = process.env.VERCEL_URL;
    process.env.APP_ENV = "preview";
    process.env.VERCEL_URL = "laduree-preview.vercel.app";
    try {
      const request = new Request("https://laduree-preview.vercel.app/api/cart/items", {
        method: "POST",
        headers: { origin: "https://laduree-preview.vercel.app" },
      });
      assert.doesNotThrow(() => assertCsrfOrigin(request));
    } finally {
      if (previousEnv === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previousEnv;
      if (previousUrl === undefined) delete process.env.VERCEL_URL;
      else process.env.VERCEL_URL = previousUrl;
    }
  });

  it("allows Vercel Preview origins only when APP_ENV=preview", () => {
    assert.deepEqual(
      vercelPreviewOrigins({
        APP_ENV: "preview",
        VERCEL_URL: "laduree-thailand-portal-okvwyy6fc-okgo.vercel.app",
        VERCEL_BRANCH_URL:
          "laduree-thailand-portal-git-cursor-sprint-34d-okgo.vercel.app",
      } as NodeJS.ProcessEnv),
      [
        "https://laduree-thailand-portal-okvwyy6fc-okgo.vercel.app",
        "https://laduree-thailand-portal-git-cursor-sprint-34d-okgo.vercel.app",
      ],
    );
    assert.deepEqual(
      vercelPreviewOrigins({
        APP_ENV: "production",
        VERCEL_URL: "laduree-thailand-portal-okvwyy6fc-okgo.vercel.app",
      } as NodeJS.ProcessEnv),
      [],
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
