/**
 * Security / production-hardening smoke (no HTTP server required).
 *
 * Run: npm run smoke:security
 */

import assert from "node:assert/strict";
import {
  EnvValidationError,
  PRODUCTION_BLOCKERS,
  resolveDataSource,
} from "@/src/server/config/env";
import { buildContentSecurityPolicy } from "@/src/server/http/security-headers";
import { hashRateLimitSubject } from "@/src/server/http/rate-limit";
import { AppError } from "@/src/server/utils/errors";
import { assertMockPaymentMutationsAllowed } from "@/src/server/payment/production-guard";

type Check = { name: string; ok: boolean; detail?: string };

function check(name: string, fn: () => void): Check {
  try {
    fn();
    return { name, ok: true };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function run(): Promise<void> {
  const results: Check[] = [];

  results.push(
    check("production refuses DATA_SOURCE=mock", () => {
      assert.throws(
        () =>
          resolveDataSource({
            nodeEnv: "production",
            appEnv: "production",
            dataSource: "mock",
            buildPhase: false,
          }),
        (error: unknown) =>
          error instanceof EnvValidationError &&
          error.message.includes("not allowed in production"),
      );
    }),
  );

  results.push(
    check("production unset DATA_SOURCE refuses silent mock", () => {
      assert.throws(
        () =>
          resolveDataSource({
            nodeEnv: "production",
            appEnv: "production",
            dataSource: undefined,
            buildPhase: false,
          }),
        EnvValidationError,
      );
    }),
  );

  results.push(
    check("staging/development may use DATA_SOURCE=mock", () => {
      assert.equal(
        resolveDataSource({
          nodeEnv: "development",
          appEnv: "development",
          dataSource: "mock",
          buildPhase: false,
        }),
        "mock",
      );
      assert.equal(
        resolveDataSource({
          nodeEnv: "production",
          appEnv: "staging",
          dataSource: "mock",
          buildPhase: false,
        }),
        "mock",
      );
    }),
  );

  results.push(
    check("build phase may fall back to mock without DATA_SOURCE", () => {
      assert.equal(
        resolveDataSource({
          nodeEnv: "production",
          appEnv: "production",
          dataSource: undefined,
          buildPhase: true,
        }),
        "mock",
      );
    }),
  );

  results.push(
    check("CSP includes frame-ancestors none", () => {
      const csp = buildContentSecurityPolicy();
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /default-src 'self'/);
    }),
  );

  results.push(
    check("rate-limit subjects are hashed (no raw email)", () => {
      const hashed = hashRateLimitSubject("customer@example.com");
      assert.equal(hashed.includes("@"), false);
      assert.equal(hashed.includes("customer"), false);
      assert.equal(hashed.length, 32);
    }),
  );

  results.push(
    check("mock payment mutations allowed in current non-prod env", () => {
      // Current process is development/test during smoke.
      assertMockPaymentMutationsAllowed();
    }),
  );

  results.push(
    check("production blockers list is non-empty", () => {
      assert.ok(PRODUCTION_BLOCKERS.length >= 5);
      assert.ok(
        PRODUCTION_BLOCKERS.some((item) =>
          item.toLowerCase().includes("admin authentication"),
        ),
      );
    }),
  );

  results.push(
    check("RATE_LIMITED error maps to 429", () => {
      const error = new AppError("RATE_LIMITED", "Too many requests.", {
        retryAfterSeconds: 12,
      });
      assert.equal(error.status, 429);
      assert.equal(error.retryAfterSeconds, 12);
    }),
  );

  const failed = results.filter((item) => !item.ok);
  for (const item of results) {
    const mark = item.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} security smoke check(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${results.length} security smoke checks passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
