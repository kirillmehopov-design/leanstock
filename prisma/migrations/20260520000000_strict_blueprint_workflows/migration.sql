-- Strict blueprint alignment: configurable dead-stock policy, inventory issue reports, staged transfers.
ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "deadStockAgeDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "deadStockDiscountPercent" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "deadStockCooldownHours" INTEGER NOT NULL DEFAULT 72;

DO $$ BEGIN
  CREATE TYPE "InventoryIssueReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "InventoryIssueReport" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "reportedById" TEXT,
  "resolvedById" TEXT,
  "oldQuantity" INTEGER NOT NULL,
  "proposedQuantity" INTEGER NOT NULL,
  "reason" "InventoryAdjustmentReason" NOT NULL,
  "note" TEXT,
  "status" "InventoryIssueReportStatus" NOT NULL DEFAULT 'PENDING',
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "InventoryIssueReport_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "InventoryIssueReport" ADD CONSTRAINT "InventoryIssueReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryIssueReport" ADD CONSTRAINT "InventoryIssueReport_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryIssueReport" ADD CONSTRAINT "InventoryIssueReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryIssueReport" ADD CONSTRAINT "InventoryIssueReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "InventoryIssueReport_tenantId_status_createdAt_idx" ON "InventoryIssueReport"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryIssueReport_tenantId_batchId_idx" ON "InventoryIssueReport"("tenantId", "batchId");
CREATE INDEX IF NOT EXISTS "InventoryIssueReport_reportedById_idx" ON "InventoryIssueReport"("reportedById");
