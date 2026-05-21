-- Blueprint alignment: global platform role, tenant suspension, and reservation warehouse/customer fields.
CREATE TYPE "GlobalRole" AS ENUM ('USER', 'SUPERADMIN');
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "User" ADD COLUMN "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "Tenant"
  ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT;

ALTER TABLE "Reservation"
  ADD COLUMN "warehouseId" TEXT,
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerEmail" TEXT;

-- Existing demo rows are allowed during migration; new application requests always set warehouseId.
UPDATE "Reservation" r
SET "warehouseId" = w."id"
FROM "Warehouse" w
WHERE r."tenantId" = w."tenantId" AND r."warehouseId" IS NULL;

ALTER TABLE "Reservation" ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "Reservation_tenantId_warehouseId_status_idx" ON "Reservation"("tenantId", "warehouseId", "status");
