import {Body,Controller,ForbiddenException,Get,Headers,HttpException,Param,Patch,Query} from "@nestjs/common";
import {createPrismaClient,type Prisma} from "@quali/database";
import {currentUser} from "./auth.controller";
import {cpfFingerprint,validCpf} from "./finance-customer.validation";

const db=createPrismaClient();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function administrator(auth?:string){
 const user=await currentUser(auth);
 if(user.role!=="ADMIN"&&user.role!=="DEV")throw new ForbiddenException("Apenas a administração pode gerir benefícios.");
 return user;
}
const missingWhere:Prisma.FinanceCustomerWhereInput={
 benefitActive:true,
 OR:[{birthDate:null},{cpfValid:false},{cpfConflict:true},{partnerId:null},{cardPlanId:null},{cardNumber:null}],
};
function missing(record:{birthDate:Date|null;cpfValid:boolean;cpfConflict:boolean;partnerId:string|null;cardPlanId:string|null;cardNumber:string|null}){
 const result:string[]=[];
 if(!record.cpfValid||record.cpfConflict)result.push("CPF inválido ou repetido");
 if(!record.birthDate)result.push("Data de nascimento");
 if(!record.partnerId)result.push("Unidade credenciada");
 if(!record.cardPlanId)result.push("Tipo de cartão");
 if(!record.cardNumber)result.push("Cartão não emitido");
 return result;
}
@Controller("admin/customer-benefits")
export class CustomerBenefitsController {
 @Get("check-cpf")
 async checkCpf(@Headers("authorization") auth:string|undefined,
  @Query("cpf") raw?:string,@Query("excludeId") excludeId?:string){
  await administrator(auth);
  const cpf=typeof raw==="string"?raw.replace(/\D/g,""):"";
  if(!validCpf(cpf))throw new HttpException("CPF inválido. Confira os onze dígitos.",400);
  if(excludeId&&!uuid.test(excludeId))throw new HttpException("ID inválido",400);
  const hash=cpfFingerprint(cpf);
  const [customers,dependents]=await Promise.all([
   db.financeCustomer.count({where:{cpfHash:hash,benefitActive:true,...(excludeId?{id:{not:excludeId}}:{})}}),
   db.cardDependent.count({where:{cpfHash:hash,benefitActive:true,customer:{benefitActive:true}}}),
  ]);
  return {blocked:customers+dependents>0,reason:customers+dependents>0?
   "CPF já possui benefício ativo e não pode ser cadastrado novamente.":"CPF disponível para novo vínculo."};
 }
 @Get("incomplete")
 async incomplete(@Headers("authorization") auth:string|undefined,
  @Query("page") pageRaw?:string){
  await administrator(auth);
  const page=Math.max(1,Math.min(1000,Number.parseInt(pageRaw||"1",10)||1));
  const [items,total]=await Promise.all([
   db.financeCustomer.findMany({where:missingWhere,orderBy:{name:"asc"},skip:(page-1)*20,take:20,
    select:{id:true,name:true,cpfLast4:true,cpfValid:true,cpfConflict:true,birthDate:true,
     partnerId:true,cardPlanId:true,cardNumber:true,benefitActive:true}}),
   db.financeCustomer.count({where:missingWhere}),
  ]);
  return {total,page,pageSize:20,items:items.map(item=>({
   id:item.id,name:item.name,cpfLast4:item.cpfLast4,missing:missing(item),
  }))};
 }
 @Patch(":id")
 async toggle(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:unknown){
  const actor=await administrator(auth);
  if(!uuid.test(id))throw new HttpException("Cliente inválido",400);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpException("Dados inválidos",400);
  const input=body as Record<string,unknown>;
  if(typeof input.active!=="boolean")throw new HttpException("Informe a situação do benefício",400);
  const reason=typeof input.reason==="string"?input.reason.trim():"";
  if(reason.length<8||reason.length>500)throw new HttpException("Informe motivo de 8 a 500 caracteres.",400);
  const active=input.active;
  return db.$transaction(async tx=>{
   const previous=await tx.financeCustomer.findUnique({where:{id},
    select:{id:true,benefitActive:true,cpfHash:true,dependents:{select:{id:true,cpfHash:true}}}});
   if(!previous)throw new HttpException("Cliente não encontrado",404);
   if(previous.benefitActive===active)throw new HttpException("O benefício já está nesta situação.",409);
   if(active){
    const hashes=[previous.cpfHash,...previous.dependents.map(d=>d.cpfHash)].filter((v):v is string=>!!v);
    if(new Set(hashes).size!==hashes.length)throw new HttpException("Existem CPFs repetidos na família. Revise antes de reativar.",409);
    const [holders,children]=await Promise.all([
     tx.financeCustomer.findMany({where:{cpfHash:{in:hashes},benefitActive:true,id:{not:id}},
      select:{id:true}}),
     tx.cardDependent.findMany({where:{cpfHash:{in:hashes},benefitActive:true,customer:{benefitActive:true}},
      select:{id:true}}),
    ]);
    if(holders.length||children.length)throw new HttpException("Existe outro benefício ativo para um CPF da família. Resolva o conflito antes de reativar.",409);
   }
   const updated=await tx.financeCustomer.update({where:{id},data:{
    benefitActive:active,benefitCancelledAt:active?null:new Date(),
    benefitCancelReason:active?null:reason,
   },select:{id:true,name:true,benefitActive:true,benefitCancelledAt:true}});
   await tx.cardDependent.updateMany({where:{customerId:id},data:{benefitActive:active}});
   await tx.auditLog.create({data:{actorId:actor.id,entityType:"FinanceCustomer",entityId:id,
    action:active?"CUSTOMER_BENEFIT_REACTIVATED":"CUSTOMER_BENEFIT_CANCELLED",
    metadata:{reason,dependentsAffected:previous.dependents.length}}});
   return updated;
  });
 }
}
