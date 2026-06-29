-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "actionHref" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_organizationId_status_createdAt_idx" ON "Alert"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_organizationId_dedupeKey_status_idx" ON "Alert"("organizationId", "dedupeKey", "status");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
