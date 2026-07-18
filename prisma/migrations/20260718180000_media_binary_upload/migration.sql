-- Binary upload metadata for Media (Sprint 17B).
-- Nullable so existing URL-based Media rows remain valid.

ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "originalFileName" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT;

CREATE INDEX IF NOT EXISTS "Media_storageProvider_idx" ON "Media"("storageProvider");
