import { Controller, ForbiddenException, Get, Header, Headers, HttpException, Param, Query } from "@nestjs/common";
import { createPrismaClient } from "@quali/database";
import { currentUser } from "./auth.controller";

const db=createPrismaClient();
const kinds=["customers","attendances","consultations","delinquents","validations","payments"] as const;
type Kind=(typeof kinds)[number];
const delinquentStatuses=["OPEN","PENDING","IN_REVIEW","AWAITING"] as const;
const MAX_ROWS=20000;

async function requireAdmin(auth?:string){
 const user=await currentUser(auth);
 if(user.role!=="DEV"&&user.role!=="ADMIN")throw new ForbiddenException("Relatórios disponíveis apenas para DEV e ADMIN.");
 return user;
}
function getMonth(raw?:string){
 const value=raw||new Date().toISOString().slice(0,7);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))throw new HttpException("Mês inválido (AAAA-MM).",400);
 const [year,month]=value.split("-").map(Number);
 return {value,start:new Date(Date.UTC(year,month-1,1)),end:new Date(Date.UTC(year,month,1))};
}
const money=(cents:number|null|undefined)=>cents===null||cents===undefined?"":(cents/100).toFixed(2).replace(".",",");
const localDate=(value:Date|null|undefined)=>value?value.toLocaleDateString("pt-BR",{timeZone:"UTC"}):"";
const dateTime=(value:Date|null|undefined)=>value?value.toISOString():"";
function csvCell(value:unknown){
 const original=String(value??"");
 // Bloqueia fórmulas do Excel/LibreOffice, inclusive espaços iniciais, tabulações e quebra de linha.
 const danger=/^[\s\u0000-\u001f]*[=+@-]/u.test(original);
 const safe=danger?"'"+original:original;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function csv(headers:string[],rows:(string|number|null|undefined)[][]){
 return "\uFEFF"+[headers,...rows].map(row=>row.map(csvCell).join(";")).join("\r\n")+"\r\n";
}
function checkMax(count:number){
 if(count>MAX_ROWS)throw new HttpException(`O relatório possui ${count} linhas, acima do limite de ${MAX_ROWS}. Use um período menor ou solicite extração assistida.`,413);
}
const paymentAuditWhere={
 action:"FINANCE_CUSTOMER_STATUS_UPDATED",
 metadata:{path:["to"],equals:"PAID"},
} as const;

@Controller("admin/reports")
export class ReportsController {
 @Get("summary")
 async summary(@Headers("authorization") auth?:string,@Query("month") monthRaw?:string){
  await requireAdmin(auth);
  const month=getMonth(monthRaw);
  const [customers,attendances,consultations,delinquents,validations,payments]=await Promise.all([
   db.financeCustomer.count(),
   db.financeAttendance.count({where:{performedAt:{gte:month.start,lt:month.end},voidedAt:null}}),
   db.financeAttendance.count({where:{performedAt:{gte:month.start,lt:month.end},voidedAt:null,serviceType:"CONSULTA"}}),
   db.financeCustomer.count({where:{status:{in:[...delinquentStatuses]}}}),
   db.auditLog.count({where:{action:"CPF_LOOKUP"}}),
   db.auditLog.count({where:paymentAuditWhere}),
  ]);
  return {month:month.value,customers,attendances,consultations,delinquents,validations,payments};
 }

 @Get(":kind")
 @Header("Content-Type","text/csv; charset=utf-8")
 @Header("Cache-Control","private, no-store")
 async exportCsv(@Headers("authorization") auth:string|undefined,@Param("kind") rawKind:string,@Query("month") monthRaw?:string){
  await requireAdmin(auth);
  if(!kinds.includes(rawKind as Kind))throw new HttpException("Tipo de relatório inválido.",404);
  const kind=rawKind as Kind,month=getMonth(monthRaw);

  if(kind==="customers"){
   const where={};
   checkMax(await db.financeCustomer.count({where}));
   const rows=await db.financeCustomer.findMany({where,orderBy:[{name:"asc"},{id:"asc"}],
    select:{id:true,name:true,invoice:true,cpfLast4:true,cpfValid:true,cpfConflict:true,birthDate:true,
      unit:true,partner:{select:{name:true}},planType:true,amountCents:true,paymentMethod:true,
      paymentDetails:true,referenceDate:true,status:true,rawStatus:true},take:MAX_ROWS});
   return csv(["ID","NF","Nome","CPF (final 4)","CPF validado","CPF duplicado","Nascimento","Unidade","Tipo de cartão",
    "Valor plano (R$)","Forma pagamento","Situação","Situação original","Detalhes","Data referência"],
    rows.map(row=>[row.id,row.invoice,row.name,row.cpfLast4,row.cpfValid?"Sim":"Não",row.cpfConflict?"Sim":"Não",
      localDate(row.birthDate),row.partner?.name||row.unit,row.planType,money(row.amountCents),row.paymentMethod,
      row.status,row.rawStatus,row.paymentDetails,localDate(row.referenceDate)]));
  }

  if(kind==="attendances"){
   const where={performedAt:{gte:month.start,lt:month.end},voidedAt:null};
   checkMax(await db.financeAttendance.count({where}));
   const rows=await db.financeAttendance.findMany({where,orderBy:[{performedAt:"desc"},{id:"asc"}],
    select:{id:true,performedAt:true,customer:{select:{name:true}},partner:{select:{name:true}},
      serviceType:true,serviceName:true,fullPriceCents:true,chargedCents:true,
      registeredBy:{select:{name:true}}},take:MAX_ROWS});
   return csv(["ID","Data","Beneficiário","Tipo","Parceiro","Serviço","Valor cheio (R$)",
    "Cobrado (R$)","Economia (R$)","Registrado por"],
    rows.map(row=>[row.id,localDate(row.performedAt),row.customer.name,row.serviceType,row.partner.name,
      row.serviceName,money(row.fullPriceCents),money(row.chargedCents),
      money(row.fullPriceCents-row.chargedCents),row.registeredBy.name]));
  }

  if(kind==="consultations"){
   const where={performedAt:{gte:month.start,lt:month.end},voidedAt:null,serviceType:"CONSULTA"};
   checkMax(await db.financeAttendance.count({where}));
   const rows=await db.financeAttendance.findMany({where,orderBy:[{customerId:"asc"},{performedAt:"asc"}],
    select:{customerId:true,performedAt:true,customer:{select:{name:true,planType:true,partner:{select:{name:true}}}},
      partner:{select:{name:true}},serviceName:true,chargedCents:true},take:MAX_ROWS});
   const usage=new Map<string,{name:string;plan:string|null;unit:string|null;count:number;last:Date}>();
   for(const item of rows){
    const previous=usage.get(item.customerId);
    if(previous){previous.count++;if(item.performedAt>previous.last)previous.last=item.performedAt;}
    else usage.set(item.customerId,{name:item.customer.name,plan:item.customer.planType,
      unit:item.customer.partner?.name||null,count:1,last:item.performedAt});
   }
   const groups=[...usage].sort((a,b)=>a[1].name.localeCompare(b[1].name,"pt-BR"));
   // O limite de 3 da referência é apenas um parâmetro de acompanhamento:
   // planos individuais podem possuir regras diferentes e não bloqueamos atendimentos.
   return csv(["Cliente ID","Beneficiário","Plano","Unidade cadastro","Consultas no mês",
    "Referência ilustrativa (3)","Acima da referência","Última consulta"],
    groups.map(([id,item])=>[id,item.name,item.plan,item.unit,item.count,3,item.count>3?"Sim":"Não",
      localDate(item.last)]));
  }

  if(kind==="delinquents"){
   const where={status:{in:[...delinquentStatuses]}};
   checkMax(await db.financeCustomer.count({where}));
   const rows=await db.financeCustomer.findMany({where,orderBy:[{name:"asc"},{id:"asc"}],
    select:{id:true,name:true,cpfLast4:true,planType:true,amountCents:true,status:true,
      referenceDate:true,paymentMethod:true,paymentDetails:true,partner:{select:{name:true}},unit:true},
    take:MAX_ROWS});
   return csv(["Cliente ID","Nome","CPF (final 4)","Plano","Unidade","Valor plano (R$)",
    "Status","Data referência","Pagamento","Detalhes"],
    rows.map(row=>[row.id,row.name,row.cpfLast4,row.planType,row.partner?.name||row.unit,
      money(row.amountCents),row.status,localDate(row.referenceDate),row.paymentMethod,row.paymentDetails]));
  }

  if(kind==="validations"){
   const where={action:"CPF_LOOKUP"};
   checkMax(await db.auditLog.count({where}));
   const rows=await db.auditLog.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],
    select:{id:true,createdAt:true,actorId:true,entityType:true,metadata:true},take:MAX_ROWS});
   const actors=await db.user.findMany({where:{id:{in:[...new Set(rows.map(item=>item.actorId).filter((id):id is string=>!!id))]}},
      select:{id:true,name:true}});
   const names=new Map(actors.map(user=>[user.id,user.name]));
   return csv(["Registro ID","Data/hora UTC","Operador","Cadastro localizado","Acesso liberado","Origem"],
    rows.map(row=>{
     const meta=row.metadata&&typeof row.metadata==="object"&&!Array.isArray(row.metadata)
       ?row.metadata as Record<string,unknown>:{};
     return [row.id,dateTime(row.createdAt),row.actorId?names.get(row.actorId)||"Operador excluído":"Sistema",
       meta.matched===true?"Sim":"Não",meta.eligible===true?"Sim":"Não",String(meta.source||row.entityType)];
    }));
  }

  // O sistema ainda não tem modelo de recebimentos/baixas financeiras.
  // Somente mudanças de status para PAID, auditadas pelo painel, podem ser exportadas.
  checkMax(await db.auditLog.count({where:paymentAuditWhere}));
  const rows=await db.auditLog.findMany({where:paymentAuditWhere,
    orderBy:[{createdAt:"desc"},{id:"asc"}],
    select:{id:true,createdAt:true,actorId:true,entityId:true,metadata:true},take:MAX_ROWS});
  const ids=[...new Set(rows.map(row=>row.entityId).filter((id):id is string=>!!id))];
  const customers=await db.financeCustomer.findMany({where:{id:{in:ids}},select:{id:true,name:true}});
  const names=new Map(customers.map(customer=>[customer.id,customer.name]));
  return csv(["Registro ID","Data/hora UTC","Cliente ID","Cliente","Situação anterior","Nova situação",
    "Observação"],rows.map(row=>{
    const meta=row.metadata&&typeof row.metadata==="object"&&!Array.isArray(row.metadata)
      ?row.metadata as Record<string,unknown>:{};
    return [row.id,dateTime(row.createdAt),row.entityId,row.entityId?names.get(row.entityId)||"": "",
      String(meta.from||""),String(meta.to||""),"Mudança de status para Pago; não comprova recebimento financeiro"];
  }));
 }
}
