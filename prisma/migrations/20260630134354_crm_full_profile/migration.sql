-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "preferences" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
