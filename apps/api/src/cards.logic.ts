import {HttpException} from "@nestjs/common";
import {cpfFingerprint,validCpf} from "./finance-customer.validation";
import type {Prisma} from "@quali/database";

const fail=(msg:string,status=400):never=>{throw new HttpException(msg,status);};
export const cardUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DependentInput={id?:string;name:string;cpf?:string;birthDate:string};
export function parseDependent(raw:unknown):DependentInput{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return fail("Dados do dependente inválidos.");
 const b=raw as Record<string,unknown>;
 if(typeof b.name!=="string"||b.name.trim().length<2||b.name.length>180)return fail("Informe o nome completo do dependente.");
 if(typeof b.birthDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(b.birthDate))return fail("Nascimento do dependente inválido.");
 const date=new Date(b.birthDate+"T00:00:00.000Z");
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==b.birthDate||date.getTime()>Date.now())
  return fail("Nascimento do dependente inválido.");
 const cpf=typeof b.cpf==="string"?b.cpf.replace(/\D/g,""):"";
 if(cpf&&!validCpf(cpf))return fail("CPF do dependente inválido.");
 const id=typeof b.id==="string"?b.id:undefined;
 if(id&&!cardUUID.test(id))return fail("Identificador do dependente inválido.");
 if(!id&&!cpf)return fail("Informe o CPF do novo dependente.");
 return {id,name:b.name.trim(),cpf:cpf||undefined,birthDate:b.birthDate};
}
export function parseDependents(raw:unknown):DependentInput[]{
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>30)return fail("São permitidos até 30 dependentes por plano. Confira o limite do cartão selecionado.");
 const items=raw.map(parseDependent);
 if(new Set(items.filter(item=>item.id).map(item=>item.id)).size!==items.filter(item=>item.id).length)
  return fail("Dependente repetido.");
 const hashes=items.filter(item=>item.cpf).map(item=>cpfFingerprint(item.cpf!));
 if(new Set(hashes).size!==hashes.length)return fail("CPF de dependente repetido.");
 return items;
}
export const cardDigits=(value:string)=>value.replace(/\D/g,"");
export function assembleCardNumber(created:Date,birth:Date,cpfLast4:string,sequence:number){
 if(sequence<1||sequence>9999)return fail("Limite de numeração de cartões atingido. Contate o administrador.",409);
 const local=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"2-digit",month:"2-digit"})
  .formatToParts(created).filter(part=>part.type==="year"||part.type==="month").map(part=>[part.type,part.value]));
 const year=local.year,month=local.month;
 const born=String(birth.getUTCFullYear()).slice(-2);
 const lastCpf=cpfLast4.slice(-2);
 if(lastCpf.length!==2)return fail("CPF insuficiente para gerar número do cartão.");
 return year+month+born+lastCpf+String(sequence).padStart(4,"0");
}
// Reservar próximo número de forma atômica na mesma transação que grava a carteirinha.
// O cartão só será emitido após confirmar a data de nascimento e os dois últimos dígitos de CPF.
export async function nextCardNumber(tx:Prisma.TransactionClient,created:Date,birth:Date,last4:string):Promise<string>{
 for(let i=0;i<100;i++){
  const counter=await tx.cardSequence.upsert({where:{key:"global"},create:{key:"global",lastValue:1},
   update:{lastValue:{increment:1}},select:{lastValue:true}});
  const candidate=assembleCardNumber(created,birth,last4,counter.lastValue);
  // Verifica também a tabela legada de beneficiários, que possui numeração própria.
  const [legacy,holder,dependent]=await Promise.all([
   tx.beneficiary.findUnique({where:{cardNumber:candidate},select:{id:true}}),
   tx.financeCustomer.findUnique({where:{cardNumber:candidate},select:{id:true}}),
   tx.cardDependent.findUnique({where:{cardNumber:candidate},select:{id:true}}),
  ]);
  if(!legacy&&!holder&&!dependent)return candidate;
 }
 throw new HttpException("Não foi possível reservar um número livre. Contate o administrador.",409);
}
