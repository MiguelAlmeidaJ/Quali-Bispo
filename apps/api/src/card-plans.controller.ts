import {Body,Controller,ForbiddenException,Get,Headers,HttpException,Param,Patch,Post} from "@nestjs/common";
import {createPrismaClient} from "@quali/database";
import {currentUser} from "./auth.controller";
import {cardUUID} from "./cards.logic";

const db=createPrismaClient();
async function staff(authorization?:string){
 const actor=await currentUser(authorization);
 if(actor.role!=="ADMIN"&&actor.role!=="DEV")throw new ForbiddenException();
 return actor;
}
type PlanInput={name:string;priceCents:number;maxDependents:number;benefits:string[];active:boolean};
function parsePlan(raw:unknown):PlanInput{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new HttpException("Dados inválidos.",400);
 const b=raw as Record<string,unknown>;
 if(typeof b.name!=="string"||b.name.trim().length<2||b.name.length>80)
  throw new HttpException("Informe o nome do cartão (até 80 caracteres).",400);
 if(!Number.isSafeInteger(b.priceCents)||Number(b.priceCents)<0||Number(b.priceCents)>100000000)
  throw new HttpException("Preço do cartão inválido.",400);
 if(b.maxDependents!==0&&b.maxDependents!==3)
  throw new HttpException("O cartão deve ser individual (0) ou familiar (até 3 dependentes).",400);
 if(!Array.isArray(b.benefits)||b.benefits.length>30||
    !b.benefits.every(x=>typeof x==="string"&&x.trim().length>0&&x.length<=180))
  throw new HttpException("Benefícios inválidos.",400);
 if(typeof b.active!=="boolean")throw new HttpException("Situação do cartão inválida.",400);
 return {name:b.name.trim(),priceCents:Number(b.priceCents),maxDependents:b.maxDependents,
  benefits:[...new Set((b.benefits as string[]).map(x=>x.trim()))],active:b.active};
}
const selection={id:true,name:true,priceCents:true,maxDependents:true,benefits:true,active:true,
 createdAt:true,updatedAt:true,_count:{select:{customers:true}}} as const;

@Controller("admin/card-plans")
export class CardPlansController {
 @Get()
 async list(@Headers("authorization") auth?:string){
  await staff(auth);
  return db.cardPlan.findMany({orderBy:{name:"asc"},select:selection});
 }
 @Post()
 async create(@Headers("authorization") auth:string|undefined,@Body() input:unknown){
  const actor=await staff(auth),data=parsePlan(input);
  try{return await db.$transaction(async tx=>{
   const plan=await tx.cardPlan.create({data,select:selection});
   await tx.auditLog.create({data:{actorId:actor.id,action:"CARD_PLAN_CREATED",entityType:"CardPlan",entityId:plan.id,
    metadata:{name:plan.name,priceCents:plan.priceCents,maxDependents:plan.maxDependents}}});
   return plan;
  });}catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")throw new HttpException("Já existe um cartão com esse nome.",409);
   throw error;
  }
 }
 @Patch(":id")
 async update(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() input:unknown){
  const actor=await staff(auth),data=parsePlan(input);
  if(!cardUUID.test(id))throw new HttpException("Identificador inválido.",400);
  const existing=await db.cardPlan.findUnique({where:{id},select:{id:true,maxDependents:true}});
  if(!existing)throw new HttpException("Tipo de cartão não encontrado.",404);
  if(data.maxDependents===0){
   const used=await db.cardDependent.count({where:{customer:{cardPlanId:id}}});
   if(used)throw new HttpException("Existem clientes com dependentes neste cartão. Não é possível torná-lo Individual.",409);
  }
  try{return await db.$transaction(async tx=>{
   const plan=await tx.cardPlan.update({where:{id},data,select:selection});
   await tx.auditLog.create({data:{actorId:actor.id,action:"CARD_PLAN_UPDATED",entityType:"CardPlan",entityId:id,
    metadata:{name:plan.name,priceCents:plan.priceCents,maxDependents:plan.maxDependents,active:plan.active}}});
   return plan;
  });}catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")throw new HttpException("Já existe um cartão com esse nome.",409);
   throw error;
  }
 }
}
