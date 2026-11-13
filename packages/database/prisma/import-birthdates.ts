import {config} from "dotenv";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {createHmac} from "node:crypto";
import {createPrismaClient} from "../src/index";

config({path:fileURLToPath(new URL("../../../.env",import.meta.url))});
type Row={sourceRow:number;cpf:string;name:string;birthDate?:string|null;planType?:string|null};
type Payload={formatVersion:number;rows:Row[]};
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
function parseDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(value+"T00:00:00.000Z");
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value&&date.getTime()<=Date.now()?date:null;
}
function validCpf(cpf:string){
 if(!/^\d{11}$/.test(cpf)||/^(\d)\1{10}$/.test(cpf))return false;
 for(let n=9;n<=10;n++){
  const total=[...cpf.slice(0,n)].reduce((sum,v,i)=>sum+Number(v)*(n+1-i),0);
  let digit=(total*10)%11;if(digit===10)digit=0;
  if(digit!==Number(cpf[n]))return false;
 }
 return true;
}
async function run(){
 const filename=process.argv.find((a,i)=>i>=2&&!a.startsWith("--"));
 const apply=process.argv.includes("--apply");
 if(!filename)throw new Error("Uso: pnpm db:import:nascimentos caminho/privado.json [--apply]. Sem --apply, somente simulação.");
 const pepper=process.env.CPF_HASH_KEY;
 if(!pepper||pepper.length<32)throw new Error("CPF_HASH_KEY não disponível. Verifique o .env.");
 const input=JSON.parse(await readFile(resolve(fileURLToPath(new URL("../../../",import.meta.url)),filename),"utf8")) as Payload;
 if(input.formatVersion!==1||!Array.isArray(input.rows)||input.rows.length>2000)throw new Error("Arquivo inválido.");
 const occurrences=new Map<string,number>();
 for(const row of input.rows){
  const cpf=typeof row.cpf==="string"?row.cpf.replace(/\D/g,""):"";
  occurrences.set(cpf,(occurrences.get(cpf)||0)+1);
 }
 const db=createPrismaClient();
 const result={rows:input.rows.length,willUpdate:0,birthDatesToUpdate:0,plansToLink:0,
  alreadyCorrect:0,conflicts:0,unmatched:0,invalid:0,missingPlan:0,applied:0};
 try{
  const plans=await db.cardPlan.findMany({select:{id:true,name:true,maxDependents:true,active:true}});
  const byName=new Map<string,typeof plans>();
  for(const plan of plans){const key=normalize(plan.name),group=byName.get(key)||[];group.push(plan);byName.set(key,group);}
  for(const row of input.rows){
   const cpf=typeof row.cpf==="string"?row.cpf.replace(/\D/g,""):"";
   const requestedDate=typeof row.birthDate==="string"&&row.birthDate.trim()?row.birthDate.trim():null;
   const date=requestedDate?parseDate(requestedDate):null;
   const planName=typeof row.planType==="string"?normalize(row.planType):"";
   if(typeof row.name!=="string"||!row.name.trim()||!validCpf(cpf)||occurrences.get(cpf)!==1||
      (requestedDate&&!date)||(!requestedDate&&!planName)){result.invalid++;continue;}
   let plan:typeof plans[number]|null=null;
   if(planName&&planName!=="—"&&planName!=="-"){
    const found=byName.get(planName)||[];
    if(found.length!==1){result.missingPlan++;continue;}
    plan=found[0];
   }
   const cpfHash=createHmac("sha256",pepper).update(cpf).digest("hex");
   const matches=await db.financeCustomer.findMany({where:{cpfHash,cpfValid:true,cpfConflict:false},
    select:{id:true,name:true,birthDate:true,cardNumber:true,cardPlanId:true},take:3});
   if(!matches.length){result.unmatched++;continue;}
   if(matches.length!==1||normalize(matches[0].name)!==normalize(row.name)){result.conflicts++;continue;}
   const existing=matches[0];
   if(date&&existing.birthDate&&existing.birthDate.toISOString().slice(0,10)!==requestedDate){result.conflicts++;continue;}
   if(date&&!existing.birthDate&&existing.cardNumber){result.conflicts++;continue;}
   if(plan&&existing.cardPlanId&&existing.cardPlanId!==plan.id){result.conflicts++;continue;}
   if(plan&&!existing.cardPlanId){
    if(!plan.active){result.conflicts++;continue;}
    const dependentCount=await db.cardDependent.count({where:{customerId:existing.id}});
    if(dependentCount>plan.maxDependents){result.conflicts++;continue;}
   }
   const setBirth=!!date&&!existing.birthDate;
   const setPlan=!!plan&&!existing.cardPlanId;
   if(!setBirth&&!setPlan){result.alreadyCorrect++;continue;}
   result.willUpdate++;
   if(setBirth)result.birthDatesToUpdate++;
   if(setPlan)result.plansToLink++;
   if(!apply)continue;
   const updated=await db.$transaction(async tx=>{
    const changed=await tx.financeCustomer.updateMany({where:{id:existing.id,
     ...(setBirth?{birthDate:null,cardNumber:null}:{}),
     ...(setPlan?{cardPlanId:null}:{})},data:{
      ...(setBirth?{birthDate:date}:{}),
      ...(setPlan&&plan?{cardPlanId:plan.id,planType:plan.name}:{})
     }});
    if(changed.count)await tx.auditLog.create({data:{
     action:"CUSTOMER_SPREADSHEET_SYNC",entityType:"FinanceCustomer",entityId:existing.id,
     metadata:{source:"controle-geral",sourceRow:row.sourceRow,birthDateUpdated:setBirth,
      cardPlanId:setPlan?plan?.id:null}}});
    return changed.count;
   });
   result.applied+=updated;
  }
  console.log(JSON.stringify({mode:apply?"APPLIED":"DRY_RUN",...result},null,2));
  console.log("Não cria clientes, não reemite cartões e preserva dados financeiros, CPFs, dependentes e nascimentos existentes.");
 }finally{await db.$disconnect();}
}
run().catch(error=>{console.error(error instanceof Error?error.message:"Atualização não concluída");process.exitCode=1;});
