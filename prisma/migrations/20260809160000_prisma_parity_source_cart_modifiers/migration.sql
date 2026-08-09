-- Sprint 29: Prisma parity — Order.sourceCartId + Product allergens/modifiers JSON
-- Apply only against approved non-production PostgreSQL (npm run db:deploy).
-- Do not invent catalog/copy; modifier JSON mirrors mock/SG structures.

ALTER TABLE "Order" ADD COLUMN "sourceCartId" UUID;

CREATE INDEX "Order_sourceCartId_idx" ON "Order"("sourceCartId");

ALTER TABLE "Product" ADD COLUMN "allergenLabel" TEXT;
ALTER TABLE "Product" ADD COLUMN "allergenText" TEXT;
ALTER TABLE "Product" ADD COLUMN "modifierGroupsJson" JSONB NOT NULL DEFAULT '[]';
