import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const MIGRATION = path.join(
  process.cwd(),
  "prisma/migrations/20260811160000_payment_concurrency_webhook_durability/migration.sql",
);

describe("Sprint 32 — payment concurrency migration (in-repo)", () => {
  it("defines partial unique index for one PENDING payment per order", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    assert.match(sql, /GatewayPayment_orderId_pending_key/);
    assert.match(
      sql,
      /CREATE UNIQUE INDEX[\s\S]*ON "GatewayPayment" \("orderId"\)[\s\S]*WHERE "status" = 'PENDING'/,
    );
  });

  it("introduces two-phase WebhookEvent status lifecycle", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    assert.match(sql, /WebhookEventStatus/);
    assert.match(sql, /'PROCESSING'/);
    assert.match(sql, /'PROCESSED'/);
    assert.match(sql, /ALTER TABLE "WebhookEvent" ADD COLUMN "status"/);
    assert.match(sql, /ALTER COLUMN "processedAt" DROP NOT NULL/);
  });
});
