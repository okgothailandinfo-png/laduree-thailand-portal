-- Sprint 21: Delivery foundation — serviceType + delivery address/fee columns.
-- Pickup behaviour preserved via ServiceType default PICKUP.

CREATE TYPE "ServiceType" AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE "DeliveryFeeStrategy" AS ENUM ('FLAT_RATE', 'DISTANCE');

ALTER TABLE "Order"
  ADD COLUMN "serviceType" "ServiceType" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "deliveryRecipient" TEXT,
  ADD COLUMN "deliveryPhone" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "deliverySubdistrict" TEXT,
  ADD COLUMN "deliveryDistrict" TEXT,
  ADD COLUMN "deliveryProvince" TEXT,
  ADD COLUMN "deliveryPostalCode" TEXT,
  ADD COLUMN "deliveryFeeMinor" INTEGER,
  ADD COLUMN "deliveryZoneId" TEXT,
  ADD COLUMN "deliveryFeeStrategy" "DeliveryFeeStrategy";

CREATE INDEX "Order_serviceType_idx" ON "Order"("serviceType");
