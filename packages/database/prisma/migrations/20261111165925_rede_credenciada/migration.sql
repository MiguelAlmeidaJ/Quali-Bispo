-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "businessHours" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "serviceType" TEXT NOT NULL DEFAULT 'Consultas médicas',
ADD COLUMN     "services" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Partner_active_name_idx" ON "Partner"("active", "name");
