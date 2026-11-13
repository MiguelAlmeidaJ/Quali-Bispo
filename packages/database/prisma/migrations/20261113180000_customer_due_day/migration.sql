ALTER TABLE "FinanceCustomer" ADD COLUMN "dueDay" INTEGER;
ALTER TABLE "FinanceCustomer" ADD CONSTRAINT "FinanceCustomer_dueDay_range" CHECK ("dueDay" IS NULL OR ("dueDay" BETWEEN 1 AND 31));
