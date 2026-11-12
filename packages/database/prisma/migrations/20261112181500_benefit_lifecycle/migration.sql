-- Controle do benefício é independente da situação financeira.
-- Cancelar não exclui titulares, dependentes, números de cartão ou histórico.
ALTER TABLE "FinanceCustomer"
  ADD COLUMN IF NOT EXISTS "benefitActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "benefitCancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "benefitCancelReason" TEXT;

ALTER TABLE "CardDependent"
  ADD COLUMN IF NOT EXISTS "benefitActive" BOOLEAN NOT NULL DEFAULT true;

-- O CPF de um dependente cancelado pode ser reutilizado em uma nova família;
-- a aplicação verifica a exclusividade entre benefícios ativos.
DROP INDEX IF EXISTS "CardDependent_cpfHash_key";
CREATE INDEX IF NOT EXISTS "CardDependent_cpfHash_idx" ON "CardDependent"("cpfHash");
CREATE INDEX IF NOT EXISTS "FinanceCustomer_benefitActive_idx" ON "FinanceCustomer"("benefitActive");
