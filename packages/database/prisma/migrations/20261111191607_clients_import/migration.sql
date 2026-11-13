-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('PAID', 'OPEN', 'EXPECTED', 'PENDING', 'IN_REVIEW', 'AWAITING', 'UNSPECIFIED');

-- CreateTable
CREATE TABLE "FinanceCustomer" (
    "id" UUID NOT NULL,
    "importKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpfHash" TEXT,
    "cpfLast4" TEXT,
    "cpfValid" BOOLEAN NOT NULL DEFAULT false,
    "cpfConflict" BOOLEAN NOT NULL DEFAULT false,
    "planType" TEXT,
    "amountCents" INTEGER,
    "paymentMethod" TEXT,
    "paymentDetails" TEXT,
    "referenceDate" DATE,
    "invoice" TEXT,
    "unit" TEXT,
    "rawStatus" TEXT,
    "status" "FinanceStatus" NOT NULL DEFAULT 'UNSPECIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceIssue" (
    "id" UUID NOT NULL,
    "importKey" TEXT NOT NULL,
    "customerId" UUID,
    "name" TEXT NOT NULL,
    "planType" TEXT,
    "amountCents" INTEGER,
    "paymentMethod" TEXT,
    "paymentDetails" TEXT,
    "referenceDate" DATE,
    "rawStatus" TEXT,
    "status" "FinanceStatus" NOT NULL DEFAULT 'UNSPECIFIED',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCustomer_importKey_key" ON "FinanceCustomer"("importKey");

-- CreateIndex
CREATE INDEX "FinanceCustomer_status_idx" ON "FinanceCustomer"("status");

-- CreateIndex
CREATE INDEX "FinanceCustomer_name_idx" ON "FinanceCustomer"("name");

-- CreateIndex
CREATE INDEX "FinanceCustomer_cpfHash_idx" ON "FinanceCustomer"("cpfHash");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceIssue_importKey_key" ON "FinanceIssue"("importKey");

-- CreateIndex
CREATE INDEX "FinanceIssue_status_resolved_idx" ON "FinanceIssue"("status", "resolved");

-- CreateIndex
CREATE INDEX "FinanceIssue_customerId_idx" ON "FinanceIssue"("customerId");

-- AddForeignKey
ALTER TABLE "FinanceIssue" ADD CONSTRAINT "FinanceIssue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "FinanceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
