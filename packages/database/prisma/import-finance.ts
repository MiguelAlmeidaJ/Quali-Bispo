import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";
import { createPrismaClient } from "../src/index";

config({path:fileURLToPath(new URL("../../../.env",import.meta.url))});

type ImportRow = {
  sourceRow:number; name:string; cpf?:string|null; invoice?:string|null;
  planType?:string|null; amountCents?:number|null; paymentMethod?:string|null;
  referenceDate?:string|null; details?:string|null; status?:string|null; unit?:string|null;
};
type Input = {formatVersion:number;customers:ImportRow[];issues:ImportRow[]};
type Status = "PAID"|"OPEN"|"EXPECTED"|"PENDING"|"IN_REVIEW"|"AWAITING"|"UNSPECIFIED";
const clean = (value:unknown,max=500):string|null => typeof value==="string"?value.trim().slice(0,max)||null:null;
const normalizeName = (s:string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const toStatus=(value:unknown):Status=>{
  const s=normalizeName(String(value||""));
  if(s==="pago")return "PAID";
  if(s.startsWith("em aberto"))return "OPEN";
  if(s==="previsto")return "EXPECTED";
  if(s==="pendente")return "PENDING";
  if(s==="tratativa")return "IN_REVIEW";
  if(s==="aguardando")return "AWAITING";
  return "UNSPECIFIED";
};
function isValidCpf(cpf:string){
  if(!/^\d{11}$/.test(cpf)||/^(\d)\1{10}$/.test(cpf))return false;
  for(let n=9;n<=10;n++){
    const sum=[...cpf.slice(0,n)].reduce((acc,v,i)=>acc+Number(v)*(n+1-i),0);
    const digit=(sum*10)%11;
    if((digit===10?0:digit)!==Number(cpf[n]))return false;
  }
  return true;
}
const date=(value:unknown):Date|null=>{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const d=new Date(value+"T00:00:00.000Z");
  return Number.isNaN(d.getTime())?null:d;
};
const cents=(v:unknown):number|null=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=100000000?Number(v):null;

async function main(){
  const inputPath=process.argv[2];
  if(!inputPath)throw new Error("Uso: pnpm db:import:financeiro private/quali_importacao_financeira_privada.json");
  const pepper=process.env.CPF_HASH_KEY;
  if(!pepper||pepper.length<32)throw new Error("CPF_HASH_KEY deve conter pelo menos 32 caracteres.");
  const repoRoot=fileURLToPath(new URL("../../../",import.meta.url));
  const raw=await readFile(resolve(repoRoot,inputPath),"utf8");
  const input=JSON.parse(raw) as Input;
  if(input.formatVersion!==1||!Array.isArray(input.customers)||!Array.isArray(input.issues))
    throw new Error("Arquivo JSON de importação inválido.");
  if(input.customers.length>10000||input.issues.length>10000)throw new Error("Importação acima do limite de 10 mil linhas.");
  const digits=input.customers.map(r=>(r.cpf||"").replace(/\D/g,""));
  const occurrences=new Map<string,number>();
  digits.filter(Boolean).forEach(d=>occurrences.set(d,(occurrences.get(d)||0)+1));
  const db=createPrismaClient();
  let customersCreated=0,customersExisting=0,issuesCreated=0,issuesExisting=0,linked=0,unmatched=0;
  const names=new Map<string,string[]>();
  try{
    for(const row of input.customers){
      if(!Number.isInteger(row.sourceRow)||!row.name?.trim())throw new Error("Linha de cliente inválida.");
      const name=clean(row.name,180)!;
      const key=`controle-geral:${row.sourceRow}`;
      const d=(row.cpf||"").replace(/\D/g,"");
      const valid=isValidCpf(d),conflict=(occurrences.get(d)||0)>1;
      const existing=await db.financeCustomer.findUnique({where:{importKey:key},select:{id:true,name:true}});
      let id=existing?.id;
      if(!id){
        const saved=await db.financeCustomer.create({data:{
          importKey:key,name,
          cpfHash:valid&&!conflict?createHmac("sha256",pepper).update(d).digest("hex"):null,
          cpfLast4:d.length>=4?d.slice(-4):null,cpfValid:valid,cpfConflict:conflict,
          planType:clean(row.planType,50),amountCents:cents(row.amountCents),
          paymentMethod:clean(row.paymentMethod,140),paymentDetails:clean(row.details,2000),
          referenceDate:date(row.referenceDate),invoice:clean(row.invoice,100),
          unit:clean(row.unit,120),rawStatus:clean(row.status,100),status:toStatus(row.status),
        },select:{id:true}});
        id=saved.id;customersCreated++;
      }else customersExisting++;
      const n=normalizeName(name),group=names.get(n)||[];group.push(id);names.set(n,group);
    }
    for(const row of input.issues){
      if(!Number.isInteger(row.sourceRow)||!row.name?.trim())throw new Error("Linha de pendência inválida.");
      const key=`pendencias:${row.sourceRow}`,name=clean(row.name,180)!;
      const matches=names.get(normalizeName(name))||[];
      const customerId=matches.length===1?matches[0]:null;
      if(customerId)linked++;else unmatched++;
      const existing=await db.financeIssue.findUnique({where:{importKey:key},select:{id:true,customerId:true}});
      if(existing){
        issuesExisting++;
        // Somente vincula pendências não vinculadas e sem ambiguidade; não altera status editado.
        if(!existing.customerId&&customerId)await db.financeIssue.update({where:{id:existing.id},data:{customerId}});
        continue;
      }
      await db.financeIssue.create({data:{
        importKey:key,customerId,name,planType:clean(row.planType,50),
        amountCents:cents(row.amountCents),paymentMethod:clean(row.paymentMethod,140),
        paymentDetails:clean(row.details,2000),referenceDate:date(row.referenceDate),
        rawStatus:clean(row.status,100),status:toStatus(row.status),
      }});
      issuesCreated++;
    }
    console.log(JSON.stringify({customersCreated,customersExisting,issuesCreated,issuesExisting,matchedIssues:linked,unmatchedOrAmbiguousIssues:unmatched}));
    console.log("CPFs inconsistentes não são associados automaticamente. Nenhum CPF em texto é armazenado no banco.");
  } finally {await db.$disconnect();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Erro de importação");process.exitCode=1;});
