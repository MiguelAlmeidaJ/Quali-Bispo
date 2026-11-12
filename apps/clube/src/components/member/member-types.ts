export type Status="PAID"|"OPEN"|"EXPECTED"|"PENDING"|"IN_REVIEW"|"AWAITING"|"UNSPECIFIED";
export type Attendance={id:string;performedAt:string;serviceName:string;serviceType:string;fullPriceCents:number;chargedCents:number;partner:{name:string}};
export type Issue={id:string;status:Status;rawStatus:string|null;amountCents:number|null;referenceDate:string|null;paymentMethod:string|null};
export type Partner={id:string;name:string;city:string;address:string;phone:string|null;businessHours:string;serviceType:string;serviceTypes:string[];services:string;discountPercent:number};
export type CatalogItem={id:string;name:string;category:"CONSULTA"|"CHECKUP"|"EXAME"|"PROCEDIMENTO"|"TERAPIA";group:string;normalPriceCents:number;qualiPriceCents:number;professional:string|null};
export type Dashboard={
 member:{name:string;cpfLast4:string|null;birthDate:string|null;planType:string|null;amountCents:number|null;status:Status;unit:string|null;joinedAt:string;referenceDate:string|null;cardNumber:string|null;cardPlan:{name:string;priceCents:number;maxDependents:number;benefits:string[]}|null};
 consultationsThisMonth:number;savingsCents:number;
 attendanceTotals:{count:number;fullPriceCents:number;chargedCents:number;savingsCents:number};
 attendances:Attendance[];issues:Issue[];partners:Partner[];catalog:CatalogItem[];
 dependentsAvailable:boolean;cardNumber:string|null;dependents:{id:string;name:string;cpfLast4:string;birthDate:string;cardNumber:string}[];
 phone:null;nextDueDate:null;consultationLimit:null;
};
export const statuses:Record<Status,string>={PAID:"Pago",OPEN:"Em aberto",EXPECTED:"Previsto",PENDING:"Pendente",IN_REVIEW:"Em tratativa",AWAITING:"Aguardando",UNSPECIFIED:"Não informado"};
export const money=(cents:number|null|undefined)=>cents==null?"Não informado":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export const date=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString("pt-BR",{timeZone:"UTC"}):"Não informado";
