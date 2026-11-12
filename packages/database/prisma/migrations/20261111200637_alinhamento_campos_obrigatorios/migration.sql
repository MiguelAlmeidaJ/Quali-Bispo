-- AlterTable
ALTER TABLE "FinanceCustomer" ADD COLUMN     "partnerId" UUID;

-- CreateIndex
CREATE INDEX "FinanceCustomer_partnerId_idx" ON "FinanceCustomer"("partnerId");

-- AddForeignKey
ALTER TABLE "FinanceCustomer" ADD CONSTRAINT "FinanceCustomer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
