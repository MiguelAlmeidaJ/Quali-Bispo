import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "../src/index";

config({path:fileURLToPath(new URL("../../../.env",import.meta.url))});
const hours="Seg a sex: 8h às 17h · Sáb: 8h às 12h · Dom: fechado";
const samples=[
 {id:"22222222-2222-4222-8222-222222222221",name:"Unidade Largo da Batalha",address:"Estr. Washington Luís, 47 – Sapê / Largo da Batalha",city:"Niterói/RJ"},
 {id:"22222222-2222-4222-8222-222222222222",name:"Unidade Venda da Cruz",address:"R. Dr. March, 5 – Venda da Cruz",city:"São Gonçalo/RJ"},
 {id:"22222222-2222-4222-8222-222222222223",name:"Unidade Vila Lage",address:"R. Dr. Alberto Torres, 1631 – Vila Lage",city:"São Gonçalo/RJ"},
 {id:"22222222-2222-4222-8222-222222222224",name:"Unidade Mutuá",address:"Av. Dezoito do Forte, 317 – Mutuá",city:"São Gonçalo/RJ"},
];
async function main(){
 const db=createPrismaClient();
 try {
  for(const item of samples){
   const existing=await db.partner.findUnique({where:{id:item.id}});
   if(existing)continue;
   await db.partner.create({data:{
    ...item,serviceType:"Consultas médicas",services:"Consultas médicas",
    businessHours:hours,discountPercent:50,active:true,
   }});
  }
  console.log("Unidades de referência cadastradas sem substituir registros existentes.");
 } finally {await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1});
