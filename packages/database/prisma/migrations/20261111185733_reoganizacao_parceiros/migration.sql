-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "serviceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
