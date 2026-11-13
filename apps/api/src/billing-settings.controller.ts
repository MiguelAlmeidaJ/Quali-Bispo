import {Body,Controller,ForbiddenException,Get,Headers,HttpException,Put} from "@nestjs/common";
import {createPrismaClient} from "@quali/database";
import {currentUser} from "./auth.controller";

const db=createPrismaClient();
export const dueDaysKey="billing.allowedDueDays";
const defaultDays:number[]=[];
export function validDays(value:unknown):value is number[]{
 return Array.isArray(value)&&value.length<=31&&
  value.every(day=>typeof day==="number"&&Number.isInteger(day)&&day>=1&&day<=31)&&
  new Set(value).size===value.length;
}
export async function allowedDueDays():Promise<number[]>{
 const setting=await db.systemSetting.findUnique({where:{key:dueDaysKey},select:{value:true}});
 return setting&&validDays(setting.value)?[...setting.value].sort((a,b)=>a-b):defaultDays;
}
async function requireAdmin(auth?:string){
 const actor=await currentUser(auth);
 if(actor.role!=="DEV"&&actor.role!=="ADMIN")throw new ForbiddenException("Acesso restrito a administradores e desenvolvedores.");
 return actor;
}
@Controller("admin/billing-settings")
export class BillingSettingsController{
 @Get("due-days")
 async list(@Headers("authorization") auth?:string){
  await requireAdmin(auth);
  return {days:await allowedDueDays()};
 }
 @Put("due-days")
 async update(@Headers("authorization") auth:string|undefined,@Body() body:unknown){
  const actor=await requireAdmin(auth);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpException("Dados inválidos",400);
  const days=(body as Record<string,unknown>).days;
  if(!validDays(days)||days.length===0)throw new HttpException("Selecione dias únicos entre 1 e 31.",400);
  const sorted=[...days].sort((a,b)=>a-b);
  // Os dias em uso são preservados no catálogo para não invalidar clientes existentes.
  const inUse=await db.financeCustomer.findMany({where:{dueDay:{not:null}},
   distinct:["dueDay"],select:{dueDay:true}});
  const missing=inUse.map(item=>item.dueDay).filter((day):day is number=>day!==null&&!sorted.includes(day));
  if(missing.length)throw new HttpException("Há clientes usando os dias "+missing.sort((a,b)=>a-b).join(", ")+". Altere esses cadastros antes de excluir os dias.",409);
  await db.$transaction(async tx=>{
   await tx.systemSetting.upsert({where:{key:dueDaysKey},create:{key:dueDaysKey,value:sorted},
    update:{value:sorted}});
   await tx.auditLog.create({data:{actorId:actor.id,action:"BILLING_DUE_DAYS_UPDATED",entityType:"SystemSetting",
    entityId:dueDaysKey,metadata:{days:sorted}}});
  });
  return {days:sorted};
 }
}
