export type FinanceStatus="PAID"|"OPEN"|"EXPECTED"|"PENDING"|"IN_REVIEW"|"AWAITING"|"UNSPECIFIED";
export const statusLabels:Record<FinanceStatus,string>={
 PAID:"Pago",OPEN:"Em aberto",EXPECTED:"Previsto",PENDING:"Pendente",
 IN_REVIEW:"Tratativa",AWAITING:"Aguardando",UNSPECIFIED:"Sem informação",
};
export type CustomerRecord={
 id:string;invoice:string|null;name:string;cpfLast4:string|null;cpfValid:boolean;cpfConflict:boolean;
 birthDate:string|null;unit:string|null;partnerId:string|null;partner:{id:string;name:string;active:boolean}|null;planType:string|null;amountCents:number|null;
 paymentMethod:string|null;status:FinanceStatus;paymentDetails:string|null;
};
export type CustomerFormData={
 invoice:string;name:string;cpf:string;birthDate:string;partnerId:string;planType:string;
 amount:string;paymentMethod:string;status:FinanceStatus;paymentDetails:string;
};
export const blankCustomer:CustomerFormData={
 invoice:"",name:"",cpf:"",birthDate:"",partnerId:"",planType:"",
 amount:"",paymentMethod:"",status:"UNSPECIFIED",paymentDetails:"",
};
export const formatCpf=(value:string)=>{
 const digits=value.replace(/\D/g,"").slice(0,11);
 return digits.replace(/^(\d{3})(\d)/,"$1.$2")
  .replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3")
  .replace(/(\d{3}\.\d{3}\.\d{3})(\d{1,2})$/,"$1-$2");
};
export const centsInput=(cents:number|null)=>cents===null?"":(cents/100).toFixed(2).replace(".",",");
export function parseCents(value:string):number|null{
 if(!value.trim())return null;
 const cleaned=value.trim().replace(/\s/g,"").replace(/\./g,"").replace(",",".");
 if(!/^\d+(?:\.\d{1,2})?$/.test(cleaned))return NaN;
 const cents=Math.round(Number(cleaned)*100);
 return Number.isSafeInteger(cents)?cents:NaN;
}
