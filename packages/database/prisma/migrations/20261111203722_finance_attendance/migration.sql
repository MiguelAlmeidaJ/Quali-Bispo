-- CreateTable
CREATE TABLE "FinanceAttendance" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "catalogItemId" UUID NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "fullPriceCents" INTEGER NOT NULL,
    "chargedCents" INTEGER NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredById" UUID NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceAttendance_performedAt_voidedAt_idx" ON "FinanceAttendance"("performedAt", "voidedAt");

-- CreateIndex
CREATE INDEX "FinanceAttendance_partnerId_performedAt_idx" ON "FinanceAttendance"("partnerId", "performedAt");

-- CreateIndex
CREATE INDEX "FinanceAttendance_customerId_performedAt_idx" ON "FinanceAttendance"("customerId", "performedAt");

-- AddForeignKey
ALTER TABLE "FinanceAttendance" ADD CONSTRAINT "FinanceAttendance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "FinanceCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttendance" ADD CONSTRAINT "FinanceAttendance_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttendance" ADD CONSTRAINT "FinanceAttendance_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttendance" ADD CONSTRAINT "FinanceAttendance_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
