-- Corrige o limite do plano "Familiar" atual (titular + 2 dependentes).
-- Nunca reduz a capacidade de um plano caso haja famílias com 3 dependentes cadastrados.
-- Outros planos mantêm seus limites definidos individualmente.
UPDATE "CardPlan" AS p
SET "maxDependents" = 2
WHERE lower(btrim(p."name")) = 'familiar'
  AND p."maxDependents" = 3
  AND NOT EXISTS (
    SELECT 1
    FROM "FinanceCustomer" AS c
    JOIN "CardDependent" AS d ON d."customerId" = c."id"
    WHERE c."cardPlanId" = p."id"
    GROUP BY c."id"
    HAVING COUNT(*) > 2
  );
