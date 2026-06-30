-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "guestId" TEXT;

-- AlterTable
ALTER TABLE "TableOrder" ADD COLUMN     "guestId" TEXT;

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guest_organizationId_name_idx" ON "Guest"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Guest_organizationId_phone_idx" ON "Guest"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Sale_guestId_idx" ON "Sale"("guestId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
