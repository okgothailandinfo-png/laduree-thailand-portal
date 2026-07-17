-- Admin product/category management fields (Sprint 16B)

-- Category: description + soft-active flag
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Category_isActive_idx" ON "Category"("isActive");

-- Product: sku, catalog active flag, sort order
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill SKU for existing rows before enforcing uniqueness
UPDATE "Product"
SET "sku" = 'SKU-' || UPPER(SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 12))
WHERE "sku" IS NULL OR "sku" = '';

ALTER TABLE "Product" ALTER COLUMN "sku" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX IF NOT EXISTS "Product_sortOrder_idx" ON "Product"("sortOrder");

-- ProductImage: primary selection
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ProductImage" AS pi
SET "isPrimary" = true
FROM (
  SELECT DISTINCT ON ("productId") "id"
  FROM "ProductImage"
  ORDER BY "productId", "sortOrder" ASC, "createdAt" ASC
) AS first_image
WHERE pi."id" = first_image."id";

CREATE INDEX IF NOT EXISTS "ProductImage_productId_isPrimary_idx"
  ON "ProductImage"("productId", "isPrimary");
