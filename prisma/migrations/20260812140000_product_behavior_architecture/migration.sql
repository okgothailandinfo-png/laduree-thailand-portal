-- Sprint 33B — Product architecture generalization
-- Create migration in-repo only. Do NOT apply to production from this sprint.
-- Deploy: prisma migrate deploy (staging/production) after owner approval.

-- CreateEnum
CREATE TYPE "ProductBehavior" AS ENUM (
  'CONFIGURABLE_BOX',
  'FIXED_PACK',
  'SIMPLE_PRODUCT',
  'OPTIONAL_CONFIGURABLE'
);

-- AlterTable Product
ALTER TABLE "Product"
  ADD COLUMN "deliveryEligible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "productBehavior" "ProductBehavior" NOT NULL DEFAULT 'SIMPLE_PRODUCT',
  ADD COLUMN "packSize" INTEGER;

CREATE INDEX "Product_productBehavior_idx" ON "Product"("productBehavior");
CREATE INDEX "Product_deliveryEligible_idx" ON "Product"("deliveryEligible");

-- AlterTable OrderItem (nullable for pre-33B historical rows)
ALTER TABLE "OrderItem"
  ADD COLUMN "productBehavior" "ProductBehavior",
  ADD COLUMN "packSize" INTEGER,
  ADD COLUMN "exactSelectionQuantity" INTEGER,
  ADD COLUMN "deliveryEligible" BOOLEAN;

CREATE INDEX "OrderItem_productBehavior_idx" ON "OrderItem"("productBehavior");
