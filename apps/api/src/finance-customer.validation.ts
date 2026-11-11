import {createHmac,randomUUID} from "node:crypto";
import {HttpException} from "@nestjs/common";

export type FinanceStatus="PAID"|"OPEN"|"EXPECTED"|"PENDING"|"IN_REVIEW"|"AWAITING"|"UNSPECIFIED";
const statuses=["PAID","OPEN","EXPECTED","PENDING","IN_REVIEW","AWAITING","UNSPECIFIED"];
const bad=(message:string)=>new HttpException(message,400);
const field=(raw:unknown,name:string,max:number,required=false):string|null=>{
 if(raw===undefined||raw===null||raw===""){if(required)throw bad(`Preencha ${name}.`);return null;}
 if(typeof raw!=="string"||raw.length>max)throw bad(`Campo ${name} inválido.`);
 const value=raw.trim();if(required&&!value)throw bad(`Preencha ${name}.`);
 return value||null;
};
export function validCpf(cpf:string):boolean{
 if(!/^\d{11}$/.test(cpf)||/^(\d)\1{10}$/.test(cpf))return false;
 for(let n=9;n<=10;n++){
  const total=[...cpf.slice(0,n)].reduce((sum,v,i)=>sum+Number(v)*(n+1-i),0);
  let digit=(total*10)%11;if(digit===10)digit=0;
  if(digit!==Number(cpf[n]))return false;
 }
 return true;
}
const date=(raw:unknown):Date|null=>{
 const value=field(raw,"data de nascimento",10);
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw bad("Data de nascimento inválida.");
 const parsed=new Date(value+"T00:00:00.000Z");
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value||
    parsed.getTime()>Date.now()||parsed.getUTCFullYear()<1900)throw bad("Data de nascimento inválida.");
 return parsed;
};
export type CustomerPayload={
 invoice:string|null;name:string;cpf:string|null;birthDate:Date|null;unit:string|null;planType:string|null;
 amountCents:number|null;paymentMethod:string|null;status:FinanceStatus;paymentDetails:string|null;
};
export function parseCustomerPayload(raw:unknown):CustomerPayload {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw bad("Dados do cliente inválidos.");
 const body=raw as Record<string,unknown>;
 const name=field(body.name,"nome",180,true)!;
 const cpf=field(body.cpf,"CPF",14);
 if(cpf&&(!/^\d{11}$/.test(cpf.replace(/\D/g,""))||!validCpf(cpf.replace(/\D/g,""))))
  throw bad("CPF inválido. Confira os 11 dígitos.");
 const cents=body.amountCents;
 if(cents!==null&&cents!==undefined&&(!Number.isSafeInteger(cents)||Number(cents)<0||Number(cents)>100000000))
  throw bad("Valor do plano inválido.");
 if(!statuses.includes(String(body.status)))throw bad("Situação inválida.");
 return {
  invoice:field(body.invoice,"NF",100),name,
  cpf:cpf?.replace(/\D/g,"")||null,
  birthDate:date(body.birthDate),unit:field(body.unit,"unidade",120),
  planType:field(body.planType,"tipo de cartão",80),
  amountCents:cents===null||cents===undefined?null:Number(cents),
  paymentMethod:field(body.paymentMethod,"forma de pagamento",140),
  status:body.status as FinanceStatus,
  paymentDetails:field(body.paymentDetails,"detalhes",2000),
 };
}
export function cpfFingerprint(cpf:string):string{
 const secret=process.env.CPF_HASH_KEY;
 if(!secret||secret.length<32)throw new Error("CPF_HASH_KEY não configurado.");
 return createHmac("sha256",secret).update(cpf).digest("hex");
}
export const createManualImportKey=()=>`manual:${randomUUID()}`;
