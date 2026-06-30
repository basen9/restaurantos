-- AlterTable
ALTER TABLE "TableOrderItem" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- CreateIndex
CREATE INDEX "TableOrderItem_voidedAt_idx" ON "TableOrderItem"("voidedAt");
