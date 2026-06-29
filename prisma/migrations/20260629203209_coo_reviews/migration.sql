-- CreateTable
CREATE TABLE "CooReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'REVIEW',
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'rules',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CooReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CooReview_organizationId_createdAt_idx" ON "CooReview"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "CooReview" ADD CONSTRAINT "CooReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
