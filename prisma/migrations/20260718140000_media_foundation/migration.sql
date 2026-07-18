-- Media library foundation (Sprint 17A)
-- URL-based assets only; ProductImage references Media by ID.

CREATE TABLE IF NOT EXISTS "Media" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Media_isActive_idx" ON "Media"("isActive");
CREATE INDEX IF NOT EXISTS "Media_createdAt_idx" ON "Media"("createdAt");
CREATE INDEX IF NOT EXISTS "Media_url_idx" ON "Media"("url");

-- Add mediaId (nullable during backfill)
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "mediaId" UUID;

-- Backfill Media rows from existing ProductImage URLs
INSERT INTO "Media" ("id", "url", "altText", "title", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  pi."url",
  pi."altText",
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductImage" pi
WHERE pi."mediaId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Media" m WHERE m."url" = pi."url"
  );

-- Link each ProductImage to a Media row with the same URL
UPDATE "ProductImage" AS pi
SET "mediaId" = m."id"
FROM "Media" AS m
WHERE pi."mediaId" IS NULL
  AND m."url" = pi."url";

-- Enforce required FK
ALTER TABLE "ProductImage" ALTER COLUMN "mediaId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductImage_mediaId_fkey'
  ) THEN
    ALTER TABLE "ProductImage"
      ADD CONSTRAINT "ProductImage_mediaId_fkey"
      FOREIGN KEY ("mediaId") REFERENCES "Media"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductImage_mediaId_idx" ON "ProductImage"("mediaId");
