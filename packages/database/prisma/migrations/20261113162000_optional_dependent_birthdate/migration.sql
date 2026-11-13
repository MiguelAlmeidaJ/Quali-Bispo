-- Permite cadastrar dependentes antes de informar a data de nascimento.
-- A emissão do número individual fica pendente até essa informação ser preenchida.
ALTER TABLE "CardDependent" ALTER COLUMN "birthDate" DROP NOT NULL;
ALTER TABLE "CardDependent" ALTER COLUMN "cardNumber" DROP NOT NULL;
