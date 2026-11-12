import {HttpException} from "@nestjs/common";
import type {Prisma} from "@quali/database";
import {cpfFingerprint} from "./finance-customer.validation";
import {cardUUID,nextCardNumber,parseDependents} from "./cards.logic";

type Tx=Prisma.TransactionClient;
const error=(msg:string,code=400):never=>{throw new HttpException(msg,code);};
export async function selectedCardPlan(tx:Tx,raw:unknown,existingId?:string|null){
 const id=raw===undefined||raw===null||raw===""?existingId||null:raw;
 if(id===null)return null;
 if(typeof id!=="string"||!cardUUID.test(id))return error("Selecione um tipo de cartão válido.");
 const plan=await tx.cardPlan.findUnique({where:{id},select:{id:true,name:true,priceCents:true,maxDependents:true,active:true}});
 if(!plan)return error("Tipo de cartão não encontrado.",404);
 if(!plan.active&&plan.id!==existingId)return error("Este tipo de cartão está inativo.");
 return plan;
}
export async function issueHolderCard(tx:Tx,customer:{
 id:string;createdAt:Date;birthDate:Date|null;cpfValid:boolean;cpfConflict:boolean;cpfLast4:string|null;cardNumber:string|null;
}){
 if(customer.cardNumber||!customer.birthDate||!customer.cpfValid||customer.cpfConflict||!customer.cpfLast4)return;
 const number=await nextCardNumber(tx,customer.createdAt,customer.birthDate,customer.cpfLast4);
 await tx.financeCustomer.update({where:{id:customer.id},data:{cardNumber:number}});
}
export async function saveDependents(tx:Tx,customerId:string,raw:unknown,capacity:number,actorId:string){
 if(raw===undefined)return;
 const inputs=parseDependents(raw);
 const current=await tx.cardDependent.findMany({where:{customerId},select:{id:true,cpfHash:true,cardNumber:true}});
 // Sem exclusão implícita: os dependentes omitidos permanecem cadastrados.
 const additions=inputs.filter(item=>!item.id);
 if(current.length+additions.length>capacity)return error(`Este cartão permite até ${capacity} dependente(s). Remova ou revise os registros existentes antes de continuar.`);
 for(const input of inputs){
  const birthday=new Date(input.birthDate+"T00:00:00.000Z");
  if(input.id){
   const own=current.find(item=>item.id===input.id);
   if(!own)return error("Dependente não pertence ao cliente.",403);
   let hash=own.cpfHash,last4:string|undefined;
   if(input.cpf){hash=cpfFingerprint(input.cpf);last4=input.cpf.slice(-4);}
   const duplicate=await tx.cardDependent.findFirst({where:{cpfHash:hash,id:{not:input.id}},select:{id:true}});
   const holder=await tx.financeCustomer.findFirst({where:{cpfHash:hash},select:{id:true}});
   if(duplicate||holder)return error("CPF já cadastrado para outro beneficiário.",409);
   await tx.cardDependent.update({where:{id:input.id},data:{name:input.name,birthDate:birthday,
     ...(last4?{cpfHash:hash,cpfLast4:last4}: {})}});
  }else{
   const hash=cpfFingerprint(input.cpf!);
   const [dependent,holder]=await Promise.all([
    tx.cardDependent.findUnique({where:{cpfHash:hash},select:{id:true}}),
    tx.financeCustomer.findFirst({where:{cpfHash:hash},select:{id:true}}),
   ]);
   if(dependent||holder)return error("CPF já cadastrado para outro beneficiário.",409);
   const customer=await tx.financeCustomer.findUniqueOrThrow({where:{id:customerId},select:{createdAt:true}});
   const number=await nextCardNumber(tx,customer.createdAt,birthday,input.cpf!.slice(-4));
   const created=await tx.cardDependent.create({data:{customerId,name:input.name,
    cpfHash:hash,cpfLast4:input.cpf!.slice(-4),birthDate:birthday,cardNumber:number},select:{id:true}});
   await tx.auditLog.create({data:{actorId,action:"CARD_DEPENDENT_CREATED",entityType:"CardDependent",
    entityId:created.id,metadata:{customerId}}});
  }
 }
}
