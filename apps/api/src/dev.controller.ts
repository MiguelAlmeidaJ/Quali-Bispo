import { Body, Controller, ForbiddenException, Get, Headers, HttpException, Post, Put, Query, UnauthorizedException } from "@nestjs/common";
import { hash } from "bcryptjs";
import { config as loadEnv } from "dotenv";
import jwt from "jsonwebtoken";
import { createPrismaClient } from "@quali/database";

loadEnv({ path: "../../.env" });
const db = createPrismaClient();
const jwtSecret = process.env.AUTH_JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error("AUTH_JWT_SECRET must have 32+ characters");

async function requireDev(header?: string) {
  if (!header?.startsWith("Bearer ")) throw new UnauthorizedException();
  let claims: { sub?: string };
  try {
    claims = jwt.verify(header.slice(7), jwtSecret!, {issuer:"quali-api",audience:"quali-admin"}) as {sub?:string};
  } catch {throw new UnauthorizedException("Sessão inválida");}
  if (!claims.sub) throw new UnauthorizedException();
  const user = await db.user.findUnique({where:{id:claims.sub},select:{id:true,role:true,active:true}});
  if (!user?.active) throw new UnauthorizedException();
  if (user.role !== "DEV") throw new ForbiddenException("Acesso exclusivo de desenvolvedor");
  return user;
}
const bad=(message:string)=>new HttpException(message,400);
const safeUser = {id:true,username:true,name:true,email:true,role:true,active:true,createdAt:true} as const;
type BrandSettings = {appName:string;primaryColor:string;secondaryColor:string;logoUrl:string;faviconUrl:string};
const defaults:BrandSettings={appName:"Quali Benefícios",primaryColor:"#0c66aa",secondaryColor:"#21834a",logoUrl:"",faviconUrl:""};
const isUrl=(value:string)=> value==="" || (/^https:\/\/[\w.-]+(?:\:[0-9]{2,5})?(?:\/[\w\-./%?=&]*)?$/.test(value) && value.length <= 500) || (/^\/(?!\/)[a-zA-Z0-9_./%-]*$/.test(value) && value.length<=500);
const isHex=(value:string)=>/^#[0-9a-fA-F]{6}$/.test(value);

@Controller("dev")
export class DevController {
  @Get("administrators")
  async administrators(@Headers("authorization") authorization?:string){
    await requireDev(authorization);
    return db.user.findMany({where:{role:"ADMIN"},select:safeUser,orderBy:{createdAt:"desc"},take:100});
  }

  @Post("administrators")
  async createAdministrator(@Headers("authorization") authorization:string|undefined,
    @Body() body:{username?:string;name?:string;email?:string;password?:string}){
    const actor=await requireDev(authorization);
    const username=body?.username?.trim().toLowerCase();
    const name=body?.name?.trim();
    const email=body?.email?.trim().toLowerCase();
    if(!username || !/^[a-z0-9._-]{3,40}$/.test(username)) throw bad("Usuário deve ter entre 3 e 40 caracteres válidos.");
    if(!name || name.length<3 || name.length>100) throw bad("Nome deve ter entre 3 e 100 caracteres.");
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>180) throw bad("E-mail inválido.");
    if(typeof body.password!=="string" || body.password.length<12 || body.password.length>128)
      throw bad("Senha deve conter entre 12 e 128 caracteres.");
    if(await db.user.findFirst({where:{OR:[{username},{email}]},select:{id:true}})) throw new HttpException("Usuário ou e-mail já cadastrado.",409);
    const passwordHash=await hash(body.password,12);
    const created=await db.$transaction(async tx=>{
      const user=await tx.user.create({data:{username,name,email,passwordHash,role:"ADMIN",active:true},select:safeUser});
      await tx.auditLog.create({data:{actorId:actor.id,action:"ADMIN_CREATED",entityType:"User",entityId:user.id,metadata:{username:user.username}}});
      return user;
    });
    return created;
  }

  @Get("audit")
  async audit(@Headers("authorization") authorization?:string,
    @Query("page") pageRaw?:string,@Query("action") action?:string){
    await requireDev(authorization);
    const page=Math.max(1,Math.min(10000,Number.parseInt(pageRaw||"1",10)||1));
    const actionFilter=action?.trim().slice(0,60);
    const where=actionFilter?{action:actionFilter}:undefined;
    const [items,total]=await Promise.all([
      db.auditLog.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*30,take:30,
        select:{id:true,actorId:true,action:true,entityType:true,entityId:true,metadata:true,createdAt:true}}),
      db.auditLog.count({where})
    ]);
    return {items,total,page,pageSize:30};
  }

  @Get("settings")
  async settings(@Headers("authorization") authorization?:string){
    await requireDev(authorization);
    const record=await db.systemSetting.findUnique({where:{key:"visualIdentity"}});
    const value=record?.value as Partial<BrandSettings>|undefined;
    return {...defaults,...value};
  }

  @Put("settings")
  async updateSettings(@Headers("authorization") authorization:string|undefined,@Body() body:BrandSettings){
    const actor=await requireDev(authorization);
    if(!body || typeof body!=="object" ||
      typeof body.appName!=="string" || body.appName.trim().length<3 || body.appName.length>80 ||
      typeof body.primaryColor!=="string" || !isHex(body.primaryColor) ||
      typeof body.secondaryColor!=="string" || !isHex(body.secondaryColor) ||
      typeof body.logoUrl!=="string" || !isUrl(body.logoUrl) ||
      typeof body.faviconUrl!=="string" || !isUrl(body.faviconUrl)) throw bad("Configurações visuais inválidas.");
    const next:BrandSettings={appName:body.appName.trim(),primaryColor:body.primaryColor,secondaryColor:body.secondaryColor,logoUrl:body.logoUrl, faviconUrl:body.faviconUrl};
    await db.$transaction(async tx=>{
      await tx.systemSetting.upsert({where:{key:"visualIdentity"},create:{key:"visualIdentity",value:{...next}},update:{value:next}});
      await tx.auditLog.create({data:{actorId:actor.id,action:"VISUAL_IDENTITY_UPDATED",entityType:"SystemSetting",entityId:"visualIdentity",metadata:{fields:Object.keys(next)}}});
    });
    return next;
  }
}
