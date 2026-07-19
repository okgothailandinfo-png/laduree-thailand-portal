-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'LINE');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM (
  'ORDER_CONFIRMED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'ORDER_PREPARING',
  'ORDER_READY_FOR_PICKUP',
  'ORDER_CANCELLED',
  'PICKUP_COMPLETED'
);

-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'SKIPPED',
  'DEAD'
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" UUID NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "orderId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "NotificationJobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationJob_idempotencyKey_key" ON "NotificationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationJob_status_scheduledAt_idx" ON "NotificationJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationJob_orderId_idx" ON "NotificationJob"("orderId");

-- CreateIndex
CREATE INDEX "NotificationJob_eventType_idx" ON "NotificationJob"("eventType");

-- CreateIndex
CREATE INDEX "NotificationJob_channel_idx" ON "NotificationJob"("channel");

-- CreateIndex
CREATE INDEX "NotificationJob_createdAt_idx" ON "NotificationJob"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationJob_status_createdAt_idx" ON "NotificationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_jobId_idx" ON "NotificationLog"("jobId");

-- CreateIndex
CREATE INDEX "NotificationLog_attemptedAt_idx" ON "NotificationLog"("attemptedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_jobId_attemptedAt_idx" ON "NotificationLog"("jobId", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_key_key" ON "NotificationSetting"("key");

-- CreateIndex
CREATE INDEX "NotificationSetting_channel_idx" ON "NotificationSetting"("channel");

-- CreateIndex
CREATE INDEX "NotificationSetting_isEnabled_idx" ON "NotificationSetting"("isEnabled");

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "NotificationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
