-- CreateTable
CREATE TABLE "PickupVerification" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "pickupCodeHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "customerRevealCipher" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PickupVerification_orderId_key" ON "PickupVerification"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupVerification_pickupCodeHash_key" ON "PickupVerification"("pickupCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "PickupVerification_tokenHash_key" ON "PickupVerification"("tokenHash");

-- CreateIndex
CREATE INDEX "PickupVerification_expiresAt_idx" ON "PickupVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "PickupVerification_verifiedAt_idx" ON "PickupVerification"("verifiedAt");

-- AddForeignKey
ALTER TABLE "PickupVerification" ADD CONSTRAINT "PickupVerification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
