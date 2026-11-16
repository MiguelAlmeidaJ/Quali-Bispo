-- Preserve every previously issued number, including historical records.
-- This migration never updates existing card numbers.
CREATE OR REPLACE FUNCTION quali_prevent_card_number_change()
RETURNS trigger AS $$
BEGIN
  IF OLD."cardNumber" IS NOT NULL
     AND NEW."cardNumber" IS DISTINCT FROM OLD."cardNumber" THEN
    RAISE EXCEPTION 'O número do cartão emitido é permanente e não pode ser alterado.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER finance_customer_card_number_immutable
BEFORE UPDATE OF "cardNumber" ON "FinanceCustomer"
FOR EACH ROW EXECUTE FUNCTION quali_prevent_card_number_change();

CREATE TRIGGER card_dependent_card_number_immutable
BEFORE UPDATE OF "cardNumber" ON "CardDependent"
FOR EACH ROW EXECUTE FUNCTION quali_prevent_card_number_change();
