-- Sprint 17C: Homepage banner and content CMS

CREATE TYPE "HomepageContentType" AS ENUM ('plain_text', 'multiline_text', 'url', 'boolean');

CREATE TABLE "HomepageBanner" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageMediaId" UUID NOT NULL,
    "mobileImageMediaId" UUID,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBanner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSection" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageContent" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "contentType" "HomepageContentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE UNIQUE INDEX "HomepageContent_key_key" ON "HomepageContent"("key");

CREATE INDEX "HomepageBanner_sortOrder_idx" ON "HomepageBanner"("sortOrder");
CREATE INDEX "HomepageBanner_isActive_idx" ON "HomepageBanner"("isActive");
CREATE INDEX "HomepageBanner_startsAt_idx" ON "HomepageBanner"("startsAt");
CREATE INDEX "HomepageBanner_endsAt_idx" ON "HomepageBanner"("endsAt");
CREATE INDEX "HomepageBanner_imageMediaId_idx" ON "HomepageBanner"("imageMediaId");
CREATE INDEX "HomepageBanner_mobileImageMediaId_idx" ON "HomepageBanner"("mobileImageMediaId");
CREATE INDEX "HomepageBanner_isActive_sortOrder_idx" ON "HomepageBanner"("isActive", "sortOrder");

CREATE INDEX "HomepageSection_sortOrder_idx" ON "HomepageSection"("sortOrder");
CREATE INDEX "HomepageSection_isActive_idx" ON "HomepageSection"("isActive");
CREATE INDEX "HomepageSection_isActive_sortOrder_idx" ON "HomepageSection"("isActive", "sortOrder");

CREATE INDEX "HomepageContent_isActive_idx" ON "HomepageContent"("isActive");
CREATE INDEX "HomepageContent_contentType_idx" ON "HomepageContent"("contentType");

ALTER TABLE "HomepageBanner" ADD CONSTRAINT "HomepageBanner_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomepageBanner" ADD CONSTRAINT "HomepageBanner_mobileImageMediaId_fkey" FOREIGN KEY ("mobileImageMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
