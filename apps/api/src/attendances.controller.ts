import { Body, Controller, ForbiddenException, Get, Headers, HttpException, Param, Patch, Post, Query } from "@nestjs/common";
import { createPrismaClient } from "@quali/database";
import { currentUser } from "./auth.controller";

const db=createPrismaClient();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const assertUuid=(value:unknown,label:string):string=>{
 if(typeof value!=="string"||!uuid.test(value))throw new HttpException(`${label} inválido.`,400);
 return value;
};
const currentMonth=()=>new Date().toISOString().slice(0,7);
function monthRange(input?:string){
 const month=input||currentMonth();
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new HttpException("Mês inválido. Use AAAA-MM.",400);
 const [year,m]=month.split("-").map(Number);
 return {gte:new Date(Date.UTC(year,m-1,1)),lt:new Date(Date.UTC(year,m,1))};
}
async function staff(header?:string){
 const user=await currentUser(header);
 if(!["DEV","ADMIN","PARTNER"].includes(user.role))throw new ForbiddenException();
 if(user.role==="PARTNER"&&!user.partnerId)throw new ForbiddenException("Sua conta não está vinculada a uma unidade.");
 return user;
}
const selection={
 id:true,customerId:true,partnerId:true,catalogItemId:true,serviceName:true,serviceType:true,
 fullPriceCents:true,chargedCents:true,performedAt:true,voidedAt:true,voidReason:true,
 customer:{select:{name:true}},partner:{select:{name:true}},registeredBy:{select:{name:true,role:true}},
} as const;

@Controller("admin/attendances")
export class AttendancesController {
 @Get("options")
 async options(@Headers("authorization") authorization?:string){
  const user=await staff(authorization);
  const [partners,services]=await Promise.all([
   db.partner.findMany({where:{active:true,...(user.role==="PARTNER"?{id:user.partnerId!}:{})},
    select:{id:true,name:true},orderBy:{name:"asc"},take:200}),
   db.catalogItem.findMany({where:{active:true},
    select:{id:true,name:true,category:true,group:true,normalPriceCents:true,qualiPriceCents:true},
    orderBy:[{displayOrder:"asc"},{name:"asc"}],take:500}),
  ]);
  return {partners,services,userPartnerId:user.role==="PARTNER"?user.partnerId:null};
 }

 @Get("customers")
 async customers(@Headers("authorization") authorization:string|undefined,@Query("q") raw?:string){
  const user=await staff(authorization);
  const q=typeof raw==="string"?raw.trim().slice(0,100):"";
  if(q.length<2)return [];
  return db.financeCustomer.findMany({
   where:{name:{contains:q,mode:"insensitive"},cpfValid:true,cpfConflict:false,benefitActive:true,
    ...(user.role==="PARTNER"?{status:"PAID" as const}:{})},
   select:{id:true,name:true,status:true,cpfLast4:true,partner:{select:{name:true}}},
   orderBy:{name:"asc"},take:20,
  });
 }

 @Get()
 async list(@Headers("authorization") authorization:string|undefined,@Query("month") month?:string,
  @Query("partnerId") partnerId?:string,@Query("serviceType") serviceType?:string,
  @Query("search") search?:string,@Query("page") pageInput?:string){
  const user=await staff(authorization);
  const period=monthRange(month);
  const term=typeof search==="string"?search.trim().slice(0,100):"";
  const requestedPartner=user.role==="PARTNER"?user.partnerId!:partnerId&&uuid.test(partnerId)?partnerId:undefined;
  const where={
   performedAt:period,voidedAt:null,
   ...(requestedPartner?{partnerId:requestedPartner}:{}),
   ...(serviceType?{serviceType:serviceType.slice(0,35)}:{}),
   ...(term?{customer:{name:{contains:term,mode:"insensitive" as const}}}:{}),
  };
  const page=Math.max(1,Math.min(10000,Number.parseInt(pageInput||"1",10)||1));
  const [items,count,aggregates,consultations]=await Promise.all([
   db.financeAttendance.findMany({where,select:selection,orderBy:[{performedAt:"desc"},{createdAt:"desc"}],skip:(page-1)*20,take:20}),
   db.financeAttendance.count({where}),
   db.financeAttendance.aggregate({where,_sum:{fullPriceCents:true,chargedCents:true}}),
   db.financeAttendance.count({where:{...where,serviceType:"CONSULTA"}}),
  ]);
  const full=aggregates._sum.fullPriceCents||0,charged=aggregates._sum.chargedCents||0;
  return {items,total:count,page,pageSize:20,summary:{fullPriceCents:full,chargedCents:charged,
    savingsCents:full-charged,consultations}};
 }

 @Post()
 async create(@Headers("authorization") authorization:string|undefined,@Body() body:unknown){
  const actor=await staff(authorization);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpException("Dados inválidos",400);
  const input=body as Record<string,unknown>;
  const customerId=assertUuid(input.customerId,"Cliente");
  const partnerId=assertUuid(input.partnerId,"Unidade");
  const catalogItemId=assertUuid(input.catalogItemId,"Procedimento");
  if(actor.role==="PARTNER"&&partnerId!==actor.partnerId)throw new ForbiddenException("É permitido registrar apenas para a sua unidade.");
  const [customer,partner,service]=await Promise.all([
   db.financeCustomer.findUnique({where:{id:customerId},select:{id:true,status:true,cpfValid:true,cpfConflict:true,benefitActive:true,name:true}}),
   db.partner.findUnique({where:{id:partnerId},select:{id:true,active:true}}),
   db.catalogItem.findUnique({where:{id:catalogItemId},select:{id:true,name:true,category:true,active:true,normalPriceCents:true,qualiPriceCents:true}}),
  ]);
  if(!customer)throw new HttpException("Cliente não encontrado.",404);
  if(customer.status!=="PAID"||!customer.benefitActive||!customer.cpfValid||customer.cpfConflict)
   throw new HttpException("Cliente sem acesso confirmado. Revise CPF e situação financeira.",403);
  if(!partner?.active)throw new HttpException("Unidade credenciada inativa ou inexistente.",400);
  if(!service?.active)throw new HttpException("Procedimento não disponível.",400);
  const performedAt=typeof input.performedAt==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(input.performedAt)
   ?new Date(input.performedAt+"T12:00:00.000Z"):new Date();
  if(Number.isNaN(performedAt.getTime())||performedAt.getTime()>Date.now()+86400000 ||
     (typeof input.performedAt==="string"&&performedAt.toISOString().slice(0,10)!==input.performedAt))
   throw new HttpException("Data de atendimento inválida.",400);
  // Os dois preços são congelados no momento do atendimento.
  return db.$transaction(async tx=>{
   const item=await tx.financeAttendance.create({data:{
    customerId,partnerId,catalogItemId,performedAt,registeredById:actor.id,
    serviceName:service.name,serviceType:service.category,
    fullPriceCents:service.normalPriceCents,chargedCents:service.qualiPriceCents,
   },select:selection});
   await tx.auditLog.create({data:{actorId:actor.id,action:"ATTENDANCE_CREATED",
    entityType:"FinanceAttendance",entityId:item.id,
    metadata:{partnerId,catalogItemId,fullPriceCents:item.fullPriceCents,chargedCents:item.chargedCents}}});
   return item;
  });
 }

 @Patch(":id/void")
 async voidAttendance(@Headers("authorization") authorization:string|undefined,@Param("id") rawId:string,@Body() body:unknown){
  const actor=await staff(authorization);
  if(actor.role==="PARTNER")throw new ForbiddenException("Somente administradores podem cancelar atendimentos.");
  const id=assertUuid(rawId,"Atendimento");
  const reason=typeof body==="object"&&body!==null&&"reason" in body&&typeof body.reason==="string"
   ?body.reason.trim().slice(0,250):"";
  if(reason.length<5)throw new HttpException("Informe o motivo do cancelamento (mínimo 5 caracteres).",400);
  return db.$transaction(async tx=>{
   const updated=await tx.financeAttendance.updateMany({where:{id,voidedAt:null},
    data:{voidedAt:new Date(),voidedById:actor.id,voidReason:reason}});
   if(!updated.count)throw new HttpException("Atendimento não encontrado ou já cancelado.",404);
   await tx.auditLog.create({data:{actorId:actor.id,action:"ATTENDANCE_VOIDED",
    entityType:"FinanceAttendance",entityId:id,metadata:{reason}}});
   return {ok:true};
  });
 }
}
