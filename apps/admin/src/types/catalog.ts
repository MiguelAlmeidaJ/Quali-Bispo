export type CatalogCategory="CONSULTA"|"CHECKUP"|"EXAME"|"PROCEDIMENTO"|"TERAPIA";
export type CatalogItem={
 id:string;name:string;category:CatalogCategory;group:string;professional:string|null;notes:string|null;
 normalPriceCents:number;qualiPriceCents:number;active:boolean;displayOrder:number;sourceDocument:string|null;
 createdAt:string;updatedAt:string;
};
export type CatalogInput=Pick<CatalogItem,"name"|"category"|"group"|"professional"|"notes"|"normalPriceCents"|"qualiPriceCents"|"active">;
export const blankCatalogItem:CatalogInput={
 name:"",category:"CONSULTA",group:"Consultas médicas",professional:null,notes:null,normalPriceCents:0,qualiPriceCents:0,active:true,
};
export const categories:Record<CatalogCategory,string>={
 CONSULTA:"Consulta",CHECKUP:"Check-up",EXAME:"Exame",PROCEDIMENTO:"Procedimento",TERAPIA:"Terapia",
};
export const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export const moneyInput=(cents:number)=>(cents/100).toFixed(2).replace(".",",");
export const toCents=(value:string)=> {
 const formatted=value.trim().replace(/\s/g,"").replace(/\./g,"").replace(",",".");
 const n=Number(formatted);
 return Number.isFinite(n)?Math.round(n*100):NaN;
};
