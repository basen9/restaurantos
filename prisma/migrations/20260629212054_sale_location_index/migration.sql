-- CreateIndex
CREATE INDEX "Sale_organizationId_locationId_soldAt_idx" ON "Sale"("organizationId", "locationId", "soldAt");
