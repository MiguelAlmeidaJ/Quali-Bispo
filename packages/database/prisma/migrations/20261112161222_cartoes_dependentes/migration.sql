/*
  Warnings:

  - A unique constraint covering the columns `[cardNumber]` on the table `FinanceCustomer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FinanceCustomer" ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "cardPlanId" UUID;

-- CreateTable
CREATE TABLE "CardPlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "maxDependents" INTEGER NOT NULL DEFAULT 0,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardSequence" (
    "key" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CardDependent" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cpfHash" TEXT NOT NULL,
    "cpfLast4" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardDependent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardPlan_name_key" ON "CardPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CardDependent_cpfHash_key" ON "CardDependent"("cpfHash");

-- CreateIndex
CREATE UNIQUE INDEX "CardDependent_cardNumber_key" ON "CardDependent"("cardNumber");

-- CreateIndex
CREATE INDEX "CardDependent_customerId_idx" ON "CardDependent"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCustomer_cardNumber_key" ON "FinanceCustomer"("cardNumber");

-- AddForeignKey
ALTER TABLE "FinanceCustomer" ADD CONSTRAINT "FinanceCustomer_cardPlanId_fkey" FOREIGN KEY ("cardPlanId") REFERENCES "CardPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardDependent" ADD CONSTRAINT "CardDependent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "FinanceCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
