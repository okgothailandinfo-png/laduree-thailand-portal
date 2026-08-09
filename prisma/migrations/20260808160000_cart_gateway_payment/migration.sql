-- Sprint 26: persistent cart + gateway payment records (PostgreSQL)

CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'THB',
    "itemsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

CREATE TYPE "GatewayPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

CREATE TABLE "GatewayPayment" (
    "id" UUID NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "GatewayPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentUrl" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "methodLabel" TEXT NOT NULL,
    "safeDisplay" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GatewayPayment_paymentId_key" ON "GatewayPayment"("paymentId");
CREATE INDEX "GatewayPayment_orderId_idx" ON "GatewayPayment"("orderId");
CREATE INDEX "GatewayPayment_status_idx" ON "GatewayPayment"("status");
CREATE INDEX "GatewayPayment_provider_idx" ON "GatewayPayment"("provider");
CREATE INDEX "GatewayPayment_createdAt_idx" ON "GatewayPayment"("createdAt");
