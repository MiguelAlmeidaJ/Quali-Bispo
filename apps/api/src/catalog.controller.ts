import { Body, Controller, ForbiddenException, Get, Headers, HttpException, Param, Patch, Post, Query, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { config as loadEnv } from "dotenv";
import { createPrismaClient } from "@quali/database";

loadEnv({ path: "../../.env" });
const db = createPrismaClient();
const secret=process.env.AUTH_JWT_SECRET;
if(!secret || secret.length<32)throw new Error("AUTH_JWT_SECRET não configurado");
const categories=["CONSULTA","CHECKUP","EXAME","PROCEDIMENTO","TERAPIA"] as const;
type Category=(typeof categories)[number];
const validCategory=(value:unknown):value is Category=>categories.includes(value as Category);
const validText=(value:unknown,max:number,required=false):string=>{
 if(typeof value!=="string" || value.length>max || (required&&!value.trim()))throw new HttpException("Campos do catálogo inválidos",400);
 return value.trim();
};
function parseInput(raw:unknown){
 if(!raw || typeof raw!=="object")throw new HttpException("Dados inválidos",400);
 const b=raw as Record<string,unknown>;
 if(!validCategory(b.category))throw new HttpException("Categoria inválida",400);
 if(!Number.isSafeInteger(b.normalPriceCents)||!Number.isSafeInteger(b.qualiPriceCents)
 ||(b.normalPriceCents as number)<=0 ||(b.qualiPriceCents as number)<0
 ||(b.qualiPriceCents as number)>(b.normalPriceCents as number)
 ||(b.normalPriceCents as number)>10_000_000)throw new HttpException("Valores inválidos",400);
 if(typeof b.active!=="boolean")throw new HttpException("Situação inválida",400);
 return {
  name:validText(b.name,200,true),
  category:b.category,
  group:validText(b.group,120,true),
  professional:validText(b.professional??"",180)||null,
  notes:validText(b.notes??"",600)||null,
  normalPriceCents:b.normalPriceCents as number,
  qualiPriceCents:b.qualiPriceCents as number,
  active:b.active,
 };
}
async function requireAdmin(header?:string){
 if(!header?.startsWith("Bearer "))throw new UnauthorizedException();
 let claims:{sub?:string};
 try {claims=jwt.verify(header.slice(7),secret!,{issuer:"quali-api",audience:"quali-admin"}) as {sub?:string};}
 catch {throw new UnauthorizedException("Sessão inválida");}
 if(!claims.sub)throw new UnauthorizedException();
 const user=await db.user.findUnique({where:{id:claims.sub},select:{id:true,role:true,active:true}});
 if(!user?.active)throw new UnauthorizedException();
 if(!["DEV","ADMIN"].includes(user.role))throw new ForbiddenException();
 return user;
}
const fields={id:true,name:true,category:true,group:true,professional:true,notes:true,normalPriceCents:true,qualiPriceCents:true,active:true,displayOrder:true,sourceDocument:true,createdAt:true,updatedAt:true} as const;
@Controller("catalog")
export class PublicCatalogController {
 @Get()
 async list(@Query("category") category?:string){
  const where=category && validCategory(category)?{active:true,category}:{active:true};
  return db.catalogItem.findMany({where,select:fields,orderBy:[{displayOrder:"asc"},{name:"asc"}],take:500});
 }
}
@Controller("admin/catalog")
export class AdminCatalogController {
 @Get()
 async list(@Headers("authorization") auth?:string){
  await requireAdmin(auth);
  return db.catalogItem.findMany({select:fields,orderBy:[{displayOrder:"asc"},{name:"asc"}],take:1000});
 }
 @Post()
 async create(@Headers("authorization") auth:string|undefined,@Body() data:unknown){
  const actor=await requireAdmin(auth),input=parseInput(data);
  return db.$transaction(async tx=>{
   const record=await tx.catalogItem.create({data:input,select:fields});
   await tx.auditLog.create({data:{actorId:actor.id,action:"CATALOG_ITEM_CREATED",entityType:"CatalogItem",entityId:record.id,metadata:{name:record.name}}});
   return record;
  });
 }
 @Patch(":id")
 async update(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() data:unknown){
  const actor=await requireAdmin(auth);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new HttpException("ID inválido",400);
  const input=parseInput(data);
  return db.$transaction(async tx=>{
   const previous=await tx.catalogItem.findUnique({where:{id}});
   if(!previous)throw new HttpException("Procedimento não encontrado",404);
   const updated=await tx.catalogItem.update({where:{id},data:input,select:fields});
   await tx.auditLog.create({data:{actorId:actor.id,action:"CATALOG_ITEM_UPDATED",entityType:"CatalogItem",entityId:updated.id,
    metadata:{name:updated.name,changedFields:Object.keys(input).filter(k=>String((previous as unknown as Record<string,unknown>)[k])!==String((input as unknown as Record<string,unknown>)[k]))}}});
   return updated;
  });
 }
}
