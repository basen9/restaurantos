-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TableOrderItem" ADD COLUMN     "notes" TEXT;
