-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "serverId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_organizationId_serverId_soldAt_idx" ON "Sale"("organizationId", "serverId", "soldAt");
