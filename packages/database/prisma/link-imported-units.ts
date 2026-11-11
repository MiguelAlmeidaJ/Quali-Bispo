import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "../src/index";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

/**
 * Reconciliacao pontual e explicita das unidades vindas da planilha.
 * Nao usa semelhante/aproximacao, nem altera vinculos existentes.
 */
const unitMappings = [
  { spreadsheetUnit: "Largo da Batalha", partnerName: "Unidade Largo da Batalha" },
  { spreadsheetUnit: "Mutua", partnerName: "Unidade Mutuá" },
  { spreadsheetUnit: "Venda da Cruz", partnerName: "Unidade Venda da Cruz" },
  { spreadsheetUnit: "Vila Lage", partnerName: "Unidade Vila Lage" },
] as const;

const normalize = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createPrismaClient();
  try {
    const [partners, unlinked, linkedCount] = await Promise.all([
      db.partner.findMany({ select: { id: true, name: true, active: true } }),
      db.financeCustomer.findMany({
        where: { partnerId: null },
        select: { id: true, unit: true },
      }),
      db.financeCustomer.count({ where: { partnerId: { not: null } } }),
    ]);

    const targets = unitMappings.map(mapping => {
      const matchingPartners = partners.filter(partner =>
        normalize(partner.name) === normalize(mapping.partnerName),
      );
      if (matchingPartners.length !== 1) {
        throw new Error(
          `A unidade de destino "${mapping.partnerName}" precisa existir exatamente uma vez na Rede Credenciada. Encontradas: ${matchingPartners.length}.`,
        );
      }
      return { ...mapping, partnerId: matchingPartners[0].id };
    });
    const groups = targets.map(target => ({
      ...target,
      ids: unlinked.filter(customer =>
        customer.unit !== null &&
        normalize(customer.unit) === normalize(target.spreadsheetUnit),
      ).map(customer => customer.id),
    }));
    const totalMatching = groups.reduce((total, group) => total + group.ids.length, 0);
    const unmatched = unlinked.length - totalMatching;

    console.log(apply ? "MODO APLICAR" : "SIMULAÇÃO — nada será alterado");
    for (const group of groups) {
      console.log(`${group.spreadsheetUnit} -> ${group.partnerName}: ${group.ids.length} cliente(s)`);
    }
    console.log(`Elegíveis para vincular: ${totalMatching}`);
    console.log(`Já vinculados anteriormente (preservados): ${linkedCount}`);
    console.log(`Sem vínculo e fora das quatro correspondências (preservados): ${unmatched}`);

    if (!apply) {
      console.log("Confira os números acima e execute pnpm db:vincular:unidades --apply para efetivar.");
      return;
    }
    const counts = await db.$transaction(async tx => {
      const results: Array<{ unit: string; updated: number }> = [];
      for (const group of groups) {
        if (!group.ids.length) {
          results.push({ unit: group.partnerName, updated: 0 });
          continue;
        }
        const result = await tx.financeCustomer.updateMany({
          where: { id: { in: group.ids }, partnerId: null },
          data: { partnerId: group.partnerId },
        });
        if (result.count) {
          await tx.auditLog.create({
            data: {
              action: "FINANCE_CUSTOMER_UNIT_BULK_LINKED",
              entityType: "FinanceCustomer",
              entityId: null,
              metadata: {
                source: "spreadsheet-unit-explicit-mapping",
                unit: group.partnerName,
                partnerId: group.partnerId,
                affectedCount: result.count,
              },
            },
          });
        }
        results.push({ unit: group.partnerName, updated: result.count });
      }
      return results;
    });
    const updated = counts.reduce((sum, group) => sum + group.updated, 0);
    console.log(`Concluído: ${updated} cliente(s) vinculado(s). Nenhum vínculo existente foi alterado.`);
    for (const group of counts) console.log(`${group.unit}: ${group.updated}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Falha na vinculação");
  process.exitCode = 1;
});
