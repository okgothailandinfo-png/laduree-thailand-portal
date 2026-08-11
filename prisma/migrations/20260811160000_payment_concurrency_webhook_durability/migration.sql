-- Sprint 32: multi-instance dual-PENDING guard + two-phase webhook claims
-- Apply only against an owner-approved non-production or production DB via db:deploy.
-- This file is shipped in-repo only; do not apply from this sprint without approval.

-- At most one PENDING gateway payment per order (multi-instance safe).
CREATE UNIQUE INDEX "GatewayPayment_orderId_pending_key"
ON "GatewayPayment" ("orderId")
WHERE "status" = 'PENDING';

-- Two-phase webhook event lifecycle.
CREATE TYPE "WebhookEventStatus" AS ENUM ('PROCESSING', 'PROCESSED');

-- Existing rows were insert-as-processed under the old model.
ALTER TABLE "WebhookEvent" ADD COLUMN "status" "WebhookEventStatus" NOT NULL DEFAULT 'PROCESSED';
ALTER TABLE "WebhookEvent" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Allow PROCESSING rows to omit processedAt; clear default for new PROCESSING claims.
ALTER TABLE "WebhookEvent" ALTER COLUMN "processedAt" DROP NOT NULL;
ALTER TABLE "WebhookEvent" ALTER COLUMN "processedAt" DROP DEFAULT;

UPDATE "WebhookEvent"
SET
  "status" = 'PROCESSED',
  "processedAt" = COALESCE("processedAt", CURRENT_TIMESTAMP);

ALTER TABLE "WebhookEvent" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
CREATE INDEX "WebhookEvent_status_updatedAt_idx" ON "WebhookEvent"("status", "updatedAt");
