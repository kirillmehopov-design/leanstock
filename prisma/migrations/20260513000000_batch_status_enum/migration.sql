-- Add BatchStatus enum and status column to InventoryBatch.
-- Also corrects StockTransfer default status from RECEIVED to REQUESTED.

CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'ARCHIVED');

ALTER TABLE "InventoryBatch"
  ADD COLUMN "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE';

-- Back-fill: batches with zero stock are DEPLETED
UPDATE "InventoryBatch"
SET "status" = 'DEPLETED'
WHERE "quantityOnHand" = 0 AND "reservedQuantity" = 0;

-- Fix StockTransfer default (schema default only, no data migration needed)
ALTER TABLE "StockTransfer"
  ALTER COLUMN "status" SET DEFAULT 'REQUESTED'::"TransferStatus";
