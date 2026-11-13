import {Body,Controller,ForbiddenException,Get,Headers,HttpException,Param,Put} from "@nestjs/common";
import {createPrismaClient} from "@quali/database";
import {hash} from "bcryptjs";
import {currentUser} from "./auth.controller";

const db=createPrismaClient();
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const safe={id:true,name:true,username:true,email:true,active:true,partnerId:true,createdAt:true} as const;
async function management(auth?:string){
 const user=await currentUser(auth);
 if(user.role!=="DEV"&&user.role!=="ADMIN")throw new ForbiddenException("Apenas a administração gerencia acessos de parceiros.");
 return user;
}
function assertId(id:string){
 if(!uuid.test(id))throw new HttpException("Unidade inválida.",400);
}
@Controller("admin/partners")
export class PartnerAccessController {
 @Get(":id/access")
 async get(@Headers("authorization") authorization:string|undefined,@Param("id") id:string){
  await management(authorization);assertId(id);
  const partner=await db.partner.findUnique({where:{id},select:{id:true,name:true,active:true}});
  if(!partner)throw new HttpException("Unidade não encontrada.",404);
  const accounts=await db.user.findMany({where:{partnerId:id,role:"PARTNER"},
   select:safe,orderBy:{createdAt:"asc"},take:10});
  return {partner,accounts};
 }
 @Put(":id/access")
 async save(@Headers("authorization") authorization:string|undefined,@Param("id") id:string,@Body() body:unknown){
  const actor=await management(authorization);assertId(id);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpException("Dados inválidos.",400);
  const input=body as Record<string,unknown>;
  const name=typeof input.name==="string"?input.name.trim():"";
  const username=typeof input.username==="string"?input.username.trim().toLowerCase():"";
  const email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
  const password=typeof input.password==="string"?input.password:"";
  const active=input.active;
  if(name.length<3||name.length>100)throw new HttpException("Nome deve ter de 3 a 100 caracteres.",400);
  if(!/^[a-z0-9._-]{3,40}$/.test(username))throw new HttpException("Usuário deve ter de 3 a 40 caracteres válidos.",400);
  if(email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpException("E-mail inválido.",400);
  if(typeof active!=="boolean")throw new HttpException("Situação inválida.",400);
  if(password&& (password.length<12||password.length>128))throw new HttpException("Senha deve ter 12 a 128 caracteres.",400);
  const partner=await db.partner.findUnique({where:{id},select:{id:true,active:true}});
  if(!partner)throw new HttpException("Unidade inexistente.",404);
  if(!partner.active&&active)throw new HttpException("Ative a unidade antes de habilitar o acesso.",409);
  const accounts=await db.user.findMany({where:{partnerId:id,role:"PARTNER"},select:{id:true},take:2,orderBy:{createdAt:"asc"}});
  if(accounts.length>1)throw new HttpException("Unidade tem mais de um usuário legado. Regularize os acessos antes de continuar.",409);
  const existing=accounts[0];
  if(!existing&&!password)throw new HttpException("Informe uma senha inicial de pelo menos 12 caracteres.",400);
  const collision=await db.user.findFirst({where:{OR:[{username},{email}],...(existing?{id:{not:existing.id}}:{})},select:{id:true}});
  if(collision)throw new HttpException("Usuário ou e-mail já utilizado por outra conta.",409);
  const passwordHash=password?await hash(password,12):undefined;
  try{
   return await db.$transaction(async tx=>{
    const user=existing?await tx.user.update({where:{id:existing.id},
     data:{name,username,email,active,...(passwordHash?{passwordHash}:{})},select:safe}):
     await tx.user.create({data:{partnerId:id,role:"PARTNER",name,username,email,
      active,passwordHash:passwordHash!},select:safe});
    await tx.auditLog.create({data:{actorId:actor.id,
     action:existing?(passwordHash?"PARTNER_ACCESS_PASSWORD_RESET":"PARTNER_ACCESS_UPDATED"):"PARTNER_ACCESS_CREATED",
     entityType:"User",entityId:user.id,metadata:{partnerId:id,username,active,passwordChanged:!!passwordHash}}});
    return user;
   });
  }catch(error){
   if(error instanceof Error&&"code" in error&&error.code==="P2002")
    throw new HttpException("Usuário ou e-mail já cadastrado.",409);
   throw error;
  }
 }
}
