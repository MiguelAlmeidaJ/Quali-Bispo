import {Body,Controller,ForbiddenException,Get,Headers,HttpException,Param,Patch,Post,Query,UnauthorizedException} from "@nestjs/common";
import {config as loadEnv} from "dotenv";
import jwt from "jsonwebtoken";
import {createPrismaClient} from "@quali/database";
import {cpfFingerprint,createManualImportKey,parseCustomerPayload} from "./finance-customer.validation";

loadEnv({path:"../../.env"});
const db=createPrismaClient(),secret=process.env.AUTH_JWT_SECRET;
if(!secret||secret.length<32)throw new Error("AUTH_JWT_SECRET não configurado");
const statuses=["PAID","OPEN","EXPECTED","PENDING","IN_REVIEW","AWAITING","UNSPECIFIED"] as const;
type Status=(typeof statuses)[number];
const validStatus=(s:unknown):s is Status=>statuses.includes(s as Status);
async function requireFinanceStaff(header?:string){
 if(!header?.startsWith("Bearer "))throw new UnauthorizedException();
 let claims:{sub?:string};
 try{claims=jwt.verify(header.slice(7),secret!,{issuer:"quali-api",audience:"quali-admin"}) as {sub?:string};}
 catch{throw new UnauthorizedException("Sessão inválida");}
 if(!claims.sub)throw new UnauthorizedException();
 const actor=await db.user.findUnique({where:{id:claims.sub},select:{id:true,active:true,role:true}});
 if(!actor?.active)throw new UnauthorizedException();
 if(actor.role!=="DEV"&&actor.role!=="ADMIN")throw new ForbiddenException();
 return actor;
}
const customerFields={
 id:true,importKey:true,name:true,birthDate:true,cpfLast4:true,cpfValid:true,cpfConflict:true,planType:true,
 amountCents:true,paymentMethod:true,paymentDetails:true,referenceDate:true,
 invoice:true,unit:true,rawStatus:true,status:true,updatedAt:true
} as const;
const issueFields={
 id:true,importKey:true,customerId:true,name:true,planType:true,amountCents:true,paymentMethod:true,
 paymentDetails:true,referenceDate:true,rawStatus:true,status:true,resolved:true,updatedAt:true
} as const;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

@Controller("admin/finance")
export class FinanceController {
 @Get("summary")
 async summary(@Headers("authorization") auth?:string){
  await requireFinanceStaff(auth);
  const [customers,paid,open,issues,unresolved,unmatched,invalidCpf]=await Promise.all([
   db.financeCustomer.count(),
   db.financeCustomer.count({where:{status:"PAID"}}),
   db.financeCustomer.count({where:{status:"OPEN"}}),
   db.financeIssue.count(),
   db.financeIssue.count({where:{resolved:false}}),
   db.financeIssue.count({where:{customerId:null,resolved:false}}),
   db.financeCustomer.count({where:{OR:[{cpfValid:false},{cpfConflict:true}]}}),
  ]);
  return {customers,paid,open,issues,unresolved,unmatched,invalidCpf};
 }
 @Get("customers")
 async customers(@Headers("authorization") auth?:string,@Query("search") search?:string,@Query("status") status?:string,
 @Query("page") pageString?:string){
  await requireFinanceStaff(auth);
  const page=Math.max(1,Math.min(1000,Number.parseInt(pageString||"1",10)||1));
  const q=typeof search==="string"?search.trim().slice(0,100):"";
  const where={...(validStatus(status)?{status}:{}),...(q?{OR:[
   {name:{contains:q,mode:"insensitive" as const}},
   {unit:{contains:q,mode:"insensitive" as const}},
  ]}:{})};
  const [items,total]=await Promise.all([
   db.financeCustomer.findMany({where,select:customerFields,orderBy:{name:"asc"},skip:(page-1)*20,take:20}),
   db.financeCustomer.count({where})
  ]);
  return {items,total,page,pageSize:20};
 }
 @Get("customers/:id")
 async customerById(@Headers("authorization") auth:string|undefined,@Param("id") id:string){
  await requireFinanceStaff(auth);
  if(!uuid.test(id))throw new HttpException("Identificador inválido",400);
  const record=await db.financeCustomer.findUnique({where:{id},select:customerFields});
  if(!record)throw new HttpException("Cliente não encontrado",404);
  return record;
 }
 @Post("customers")
 async createCustomer(@Headers("authorization") auth:string|undefined,@Body() body:unknown){
  const actor=await requireFinanceStaff(auth);
  const payload=parseCustomerPayload(body);
  const cpfHash=payload.cpf?cpfFingerprint(payload.cpf):null;
  if(cpfHash&&await db.financeCustomer.findFirst({where:{cpfHash},select:{id:true}}))
   throw new HttpException("CPF já está vinculado a outro cliente. Verifique o cadastro existente.",409);
  try {
   return await db.$transaction(async tx=>{
    const record=await tx.financeCustomer.create({data:{
     importKey:createManualImportKey(),name:payload.name,invoice:payload.invoice,
     birthDate:payload.birthDate,unit:payload.unit,planType:payload.planType,
     amountCents:payload.amountCents,paymentMethod:payload.paymentMethod,
     status:payload.status,paymentDetails:payload.paymentDetails,
     cpfHash,cpfLast4:payload.cpf?.slice(-4)||null,cpfValid:!!payload.cpf,cpfConflict:false,
    },select:customerFields});
    await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_CREATED",
     entityType:"FinanceCustomer",entityId:record.id,metadata:{fields:["name","invoice","birthDate","unit","planType","amountCents","paymentMethod","status","paymentDetails","cpfHash"]}}});
    return record;
   });
  }catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")
    throw new HttpException("Cadastro duplicado.",409);
   throw error;
  }
 }
 @Get("issues")
 async issues(@Headers("authorization") auth?:string,@Query("search") search?:string,@Query("status") status?:string,
 @Query("page") pageString?:string,@Query("unresolved") unresolved?:string){
  await requireFinanceStaff(auth);
  const page=Math.max(1,Math.min(1000,Number.parseInt(pageString||"1",10)||1));
  const q=typeof search==="string"?search.trim().slice(0,100):"";
  const where={...(validStatus(status)?{status}:{}),...(unresolved==="true"?{resolved:false}:{}),
   ...(q?{name:{contains:q,mode:"insensitive" as const}}:{})};
  const [items,total]=await Promise.all([
   db.financeIssue.findMany({where,select:issueFields,orderBy:[{resolved:"asc"},{createdAt:"asc"}],skip:(page-1)*20,take:20}),
   db.financeIssue.count({where}),
  ]);
  return {items,total,page,pageSize:20};
 }
 @Patch("customers/:id")
 async updateCustomer(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:unknown){
  const actor=await requireFinanceStaff(auth);
  if(!uuid.test(id))throw new HttpException("Identificador inválido",400);
  const previous=await db.financeCustomer.findUnique({where:{id}});
  if(!previous)throw new HttpException("Cliente não encontrado",404);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpException("Dados inválidos",400);
  const raw=body as Record<string,unknown>;
  // Compatibilidade com a troca rápida de situação na tabela existente.
  const isStatusOnly=Object.keys(raw).length===1&&Object.prototype.hasOwnProperty.call(raw,"status");
  if(isStatusOnly){
   const status=raw.status;
   if(!validStatus(status))throw new HttpException("Situação inválida",400);
   return db.$transaction(async tx=>{
    const record=await tx.financeCustomer.update({where:{id},data:{status},select:customerFields});
    await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_STATUS_UPDATED",entityType:"FinanceCustomer",entityId:id,
     metadata:{from:previous.status,to:record.status}}});
    return record;
   });
  }
  const payload=parseCustomerPayload(raw);
  const cpfHash=payload.cpf?cpfFingerprint(payload.cpf):previous.cpfHash;
  if(payload.cpf){
   const duplicate=await db.financeCustomer.findFirst({where:{cpfHash,id:{not:id}},select:{id:true}});
   if(duplicate)throw new HttpException("CPF já está vinculado a outro cliente.",409);
  }
  try {
   return await db.$transaction(async tx=>{
    const record=await tx.financeCustomer.update({where:{id},data:{
     name:payload.name,invoice:payload.invoice,birthDate:payload.birthDate,
     unit:payload.unit,planType:payload.planType,amountCents:payload.amountCents,
     paymentMethod:payload.paymentMethod,paymentDetails:payload.paymentDetails,status:payload.status,
     ...(payload.cpf?{cpfHash,cpfLast4:payload.cpf.slice(-4),cpfValid:true,cpfConflict:false}:{}),
    },select:customerFields});
    await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_UPDATED",
     entityType:"FinanceCustomer",entityId:id,
     metadata:{fields:["name","invoice","birthDate","unit","planType","amountCents","paymentMethod","status","paymentDetails",...(payload.cpf?["cpfHash"]:[])]}}});
    return record;
   });
  }catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")
    throw new HttpException("Cadastro duplicado.",409);
   throw error;
  }
 }
 @Patch("issues/:id")
 async updateIssue(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:{status?:unknown;resolved?:unknown}){
  const actor=await requireFinanceStaff(auth);
  if(!uuid.test(id))throw new HttpException("Identificador inválido",400);
  const status=body?.status;
  const resolved=body?.resolved;
  if(!validStatus(status)||typeof resolved!=="boolean")throw new HttpException("Dados inválidos",400);
  const existing=await db.financeIssue.findUnique({where:{id},select:{id:true,status:true,resolved:true}});
  if(!existing)throw new HttpException("Pendência não encontrada",404);
  return db.$transaction(async tx=>{
   const item=await tx.financeIssue.update({where:{id},data:{status,resolved},select:issueFields});
   await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_ISSUE_UPDATED",entityType:"FinanceIssue",entityId:id,
    metadata:{from:existing.status,to:item.status,resolved:item.resolved}}});
   return item;
  });
 }
}
