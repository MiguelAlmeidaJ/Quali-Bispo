import {Body,Controller,ForbiddenException,Get,Headers,HttpException,Param,Patch,Post,Query,UnauthorizedException} from "@nestjs/common";
import {config as loadEnv} from "dotenv";
import jwt from "jsonwebtoken";
import {createPrismaClient} from "@quali/database";
import {cpfFingerprint,createManualImportKey,parseCustomerPayload,validCpf} from "./finance-customer.validation";
import {issueHolderCard,saveDependents,selectedCardPlan} from "./finance-cards.service";
import {nextCardNumber,parseDependents} from "./cards.logic";
import {allowedDueDays} from "./billing-settings.controller";

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
 id:true,importKey:true,name:true,birthDate:true,dueDay:true,cpfLast4:true,cpfValid:true,cpfConflict:true,planType:true,
 benefitActive:true,benefitCancelledAt:true,benefitCancelReason:true,
 cardPlanId:true,cardPlan:{select:{id:true,name:true,priceCents:true,maxDependents:true,benefits:true,active:true}},cardNumber:true,
 dependents:{select:{id:true,name:true,cpfLast4:true,birthDate:true,cardNumber:true},orderBy:{createdAt:"asc"}},
 amountCents:true,paymentMethod:true,paymentDetails:true,referenceDate:true,
 invoice:true,unit:true,partnerId:true,partner:{select:{id:true,name:true,active:true}},rawStatus:true,status:true,updatedAt:true
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
  const input=body as Record<string,unknown>;
  if(payload.dueDay!==null&&!(await allowedDueDays()).includes(payload.dueDay))throw new HttpException("Dia de vencimento não permitido nas Configurações.",400);
  const cpf=payload.cpf;
  if(!cpf||!payload.birthDate)throw new HttpException("CPF e data de nascimento são obrigatórios para emitir o cartão.",400);
  if(!payload.partnerId)throw new HttpException("Selecione uma unidade da Rede Credenciada.",400);
  const assigned=await db.partner.findUnique({where:{id:payload.partnerId},select:{id:true,name:true,active:true}});
  if(!assigned?.active)throw new HttpException("Unidade credenciada não encontrada ou inativa.",400);
  const cpfHash=cpfFingerprint(cpf);
  if(await db.financeCustomer.findFirst({where:{cpfHash,benefitActive:true},select:{id:true}})||
     await db.cardDependent.findFirst({where:{cpfHash,benefitActive:true,customer:{benefitActive:true}},select:{id:true}}))
    throw new HttpException("CPF já vinculado a outro beneficiário.",409);
  // Valida a lista antes da transação.
  parseDependents(input.dependents);
  try{return await db.$transaction(async tx=>{
   const plan=await selectedCardPlan(tx,input.cardPlanId);
   if(!plan)throw new HttpException("Selecione um tipo de cartão cadastrado.",400);
   const record=await tx.financeCustomer.create({data:{
    importKey:createManualImportKey(),name:payload.name,invoice:payload.invoice,
    birthDate:payload.birthDate,dueDay:payload.dueDay,partnerId:assigned.id,unit:assigned.name,
    planType:plan.name,cardPlanId:plan.id,amountCents:plan.priceCents,
    paymentMethod:payload.paymentMethod,status:payload.status,paymentDetails:payload.paymentDetails,
    cpfHash,cpfLast4:cpf.slice(-4),cpfValid:true,cpfConflict:false,
   },select:{id:true,createdAt:true,birthDate:true,cpfValid:true,cpfConflict:true,cpfLast4:true,cardNumber:true}});
   await issueHolderCard(tx,record);
   await saveDependents(tx,record.id,input.dependents,plan.maxDependents,actor.id);
   await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_CREATED",
    entityType:"FinanceCustomer",entityId:record.id,metadata:{partnerId:assigned.id,cardPlanId:plan.id}}});
   return tx.financeCustomer.findUniqueOrThrow({where:{id:record.id},select:customerFields});
  });}catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")
    throw new HttpException("CPF ou número de cartão já cadastrado.",409);
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
  const input=body as Record<string,unknown>;
  // Alteração sensível: endpoint lógico independente do formulário normal.
  if(Object.keys(input).length===1&&Object.prototype.hasOwnProperty.call(input,"cpfCorrection")){
   const correction=input.cpfCorrection;
   if(!correction||typeof correction!=="object"||Array.isArray(correction))
    throw new HttpException("Correção de CPF inválida.",400);
   const data=correction as Record<string,unknown>;
   const cpf=typeof data.cpf==="string"?data.cpf.replace(/\\D/g,""):"";
   const reason=typeof data.reason==="string"?data.reason.trim():"";
   if(!validCpf(cpf))throw new HttpException("Informe um CPF válido.",400);
   if(reason.length<8||reason.length>500)throw new HttpException("Informe o motivo da correção (8 a 500 caracteres).",400);
   const hash=cpfFingerprint(cpf);
   if(hash===previous.cpfHash)throw new HttpException("O CPF informado é igual ao cadastrado.",400);
   try{return await db.$transaction(async tx=>{
    const record=await tx.financeCustomer.findUniqueOrThrow({where:{id},
     select:{id:true,cpfHash:true,cpfLast4:true,cardNumber:true,birthDate:true,createdAt:true,benefitActive:true}});
    if(record.cpfHash!==previous.cpfHash||record.cardNumber!==previous.cardNumber)
     throw new HttpException("O cadastro foi alterado por outro usuário. Recarregue a página.",409);
    const [holder,dependent]=await Promise.all([
     tx.financeCustomer.findFirst({where:{cpfHash:hash,benefitActive:true,id:{not:id}},select:{id:true}}),
     tx.cardDependent.findFirst({where:{cpfHash:hash,benefitActive:true,customer:{benefitActive:true}},select:{id:true}}),
    ]);
    if(holder||dependent)throw new HttpException("CPF já vinculado a outro benefício ativo.",409);
    // A numeração emitida contém os dígitos finais do CPF: substituir exige nova emissão.
    const newCard=record.cardNumber&&record.birthDate?
     await nextCardNumber(tx,record.createdAt,record.birthDate,cpf.slice(-4)):null;
    await tx.financeCustomer.update({where:{id},data:{
     cpfHash:hash,cpfLast4:cpf.slice(-4),cpfValid:true,cpfConflict:false,
     ...(record.cardNumber?{cardNumber:newCard}:{}),
    }});
    await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_CPF_CORRECTED",
     entityType:"FinanceCustomer",entityId:id,
     metadata:{reason,previousLast4:record.cpfLast4,newLast4:cpf.slice(-4),
      oldCardNumber:record.cardNumber,newCardNumber:newCard,cardReissued:!!record.cardNumber}}});
    return tx.financeCustomer.findUniqueOrThrow({where:{id},select:customerFields});
   });}catch(error){
    if(error instanceof Error&&"code" in error&&error.code==="P2002")
     throw new HttpException("CPF ou número de cartão já cadastrado.",409);
    throw error;
   }
  }
  if(Object.keys(input).length===1&&Object.prototype.hasOwnProperty.call(input,"status")){
   const status=input.status;
   if(!validStatus(status))throw new HttpException("Situação inválida",400);
   return db.$transaction(async tx=>{
    const item=await tx.financeCustomer.update({where:{id},data:{status},select:customerFields});
    await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_STATUS_UPDATED",
     entityType:"FinanceCustomer",entityId:id,metadata:{from:previous.status,to:item.status}}});
    return item;
   });
  }
  if(Object.prototype.hasOwnProperty.call(input,"cpf")&&input.cpf!==null&&input.cpf!=="" )
   throw new HttpException("Use a ação específica para correção de CPF.",400);
  const payload=parseCustomerPayload({...input,status:previous.status,cpf:null});
  if(payload.dueDay!==null&&payload.dueDay!==previous.dueDay&&!(await allowedDueDays()).includes(payload.dueDay))throw new HttpException("Dia de vencimento não permitido nas Configurações.",400);
  parseDependents(input.dependents);
  if(previous.cardNumber){
   const changedBirth=(payload.birthDate?.toISOString().slice(0,10)||null)!==(previous.birthDate?.toISOString().slice(0,10)||null);
   const changedCpf=!!payload.cpf&&cpfFingerprint(payload.cpf)!==previous.cpfHash;
   if(changedBirth||changedCpf)throw new HttpException(
    "O cartão já foi emitido. A correção de CPF ou nascimento exige reemissão administrativa controlada.",409);
  }
  let partnerId=previous.partnerId;
  if(payload.partnerId){
   const partner=await db.partner.findUnique({where:{id:payload.partnerId},select:{id:true,active:true}});
   if(!partner||(!partner.active&&partner.id!==previous.partnerId))
    throw new HttpException("Unidade inexistente ou inativa.",400);
   partnerId=partner.id;
  }else if(previous.partnerId)throw new HttpException("Selecione uma unidade credenciada.",400);
  const cpfHash=payload.cpf?cpfFingerprint(payload.cpf):previous.cpfHash;
  if(payload.cpf){
   if(await db.financeCustomer.findFirst({where:{cpfHash,benefitActive:true,id:{not:id}},select:{id:true}})||
      await db.cardDependent.findFirst({where:{cpfHash:cpfHash!,benefitActive:true,customer:{benefitActive:true}},select:{id:true}}))
    throw new HttpException("CPF já utilizado por outro beneficiário.",409);
  }
  try{return await db.$transaction(async tx=>{
   const plan=await selectedCardPlan(tx,input.cardPlanId,previous.cardPlanId);
   const existingDependents=await tx.cardDependent.count({where:{customerId:id}});
   if(plan&&existingDependents>plan.maxDependents)
    throw new HttpException("O novo cartão não comporta os dependentes existentes.",409);
   if(input.dependents!==undefined&&!plan)throw new HttpException("Selecione um tipo de cartão antes de incluir dependentes.",400);
   const record=await tx.financeCustomer.update({where:{id},data:{
    name:payload.name,invoice:payload.invoice,birthDate:payload.birthDate,dueDay:payload.dueDay,
    ...(partnerId?{partnerId}:{}),
    ...(plan?{cardPlanId:plan.id,planType:plan.name,amountCents:plan.priceCents}:
      {planType:payload.planType,amountCents:payload.amountCents}),
    paymentMethod:payload.paymentMethod,paymentDetails:payload.paymentDetails,
   },select:{id:true,createdAt:true,birthDate:true,cpfValid:true,cpfConflict:true,cpfLast4:true,cardNumber:true}});
   if(plan)await issueHolderCard(tx,record);
   if(input.dependents!==undefined)await saveDependents(tx,id,input.dependents,plan!.maxDependents,actor.id);
   await tx.auditLog.create({data:{actorId:actor.id,action:"FINANCE_CUSTOMER_UPDATED",
    entityType:"FinanceCustomer",entityId:id,metadata:{cardPlanId:plan?.id||null,partnerId}}});
   return tx.financeCustomer.findUniqueOrThrow({where:{id},select:customerFields});
  });}catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")
    throw new HttpException("CPF ou número de cartão já cadastrado.",409);
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
