-- CreateEnum
CREATE TYPE "CatalogCategory" AS ENUM ('CONSULTA', 'CHECKUP', 'EXAME', 'PROCEDIMENTO', 'TERAPIA');

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" UUID NOT NULL,
    "importKey" TEXT,
    "name" TEXT NOT NULL,
    "category" "CatalogCategory" NOT NULL,
    "group" TEXT NOT NULL,
    "professional" TEXT,
    "notes" TEXT,
    "normalPriceCents" INTEGER NOT NULL,
    "qualiPriceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceDocument" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_importKey_key" ON "CatalogItem"("importKey");

-- CreateIndex
CREATE INDEX "CatalogItem_active_category_displayOrder_idx" ON "CatalogItem"("active", "category", "displayOrder");

-- CreateIndex
CREATE INDEX "CatalogItem_group_idx" ON "CatalogItem"("group");
