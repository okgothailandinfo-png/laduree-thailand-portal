-- AlterEnum: add fulfilment statuses for admin order management
ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE 'READY_FOR_PICKUP';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETED';

-- CreateTable
CREATE TABLE "OrderHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderHistory_orderId_idx" ON "OrderHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderHistory_createdAt_idx" ON "OrderHistory"("createdAt");

-- CreateIndex
CREATE INDEX "OrderHistory_orderId_createdAt_idx" ON "OrderHistory"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
