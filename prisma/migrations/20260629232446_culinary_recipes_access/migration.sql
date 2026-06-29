-- CreateEnum
CREATE TYPE "RecipeAccess" AS ENUM ('OWNER_ONLY', 'OWNER_MANAGER', 'ALL_COOKS', 'SELECTED');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "chefTips" TEXT,
ADD COLUMN     "cookNotes" TEXT,
ADD COLUMN     "fullRecipeAccess" "RecipeAccess" NOT NULL DEFAULT 'OWNER_ONLY',
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prepTimeMin" INTEGER;

-- CreateTable
CREATE TABLE "RecipeAccessUser" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RecipeAccessUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeAccessUser_userId_idx" ON "RecipeAccessUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeAccessUser_recipeId_userId_key" ON "RecipeAccessUser"("recipeId", "userId");

-- AddForeignKey
ALTER TABLE "RecipeAccessUser" ADD CONSTRAINT "RecipeAccessUser_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeAccessUser" ADD CONSTRAINT "RecipeAccessUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
