import { Body, Controller, ForbiddenException, Get, Headers, HttpException, Param, Patch, Post, Query, UnauthorizedException } from "@nestjs/common";
import { config as loadEnv } from "dotenv";
import jwt from "jsonwebtoken";
import { createPrismaClient } from "@quali/database";

loadEnv({ path: "../../.env" });
const db = createPrismaClient();
const secret = process.env.AUTH_JWT_SECRET;
if (!secret || secret.length < 32) throw new Error("AUTH_JWT_SECRET não configurado");

type PartnerInput = {
  name: string; serviceType: string; services: string; address: string;
  city: string; phone: string | null; businessHours: string; discountPercent: number; active: boolean;
};
const text = (value: unknown, max: number, required = false): string => {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new HttpException("Dados de parceiro inválidos", 400);
  }
  return value.trim();
};
const parseInput = (raw: unknown): PartnerInput => {
  if (!raw || typeof raw !== "object") throw new HttpException("Dados inválidos", 400);
  const body = raw as Record<string, unknown>;
  const phone = text(body.phone ?? "", 30);
  const discount = body.discountPercent;
  if (typeof discount !== "number" || !Number.isInteger(discount) || discount < 0 || discount > 100) {
    throw new HttpException("Desconto deve ser um percentual de 0 a 100", 400);
  }
  if (typeof body.active !== "boolean") throw new HttpException("Situação inválida", 400);
  return {
    name: text(body.name, 120, true),
    serviceType: text(body.serviceType, 80, true),
    services: text(body.services, 600),
    address: text(body.address, 250, true),
    city: text(body.city, 100, true),
    phone: phone || null,
    businessHours: text(body.businessHours, 250),
    discountPercent: discount,
    active: body.active,
  };
};
async function requireStaff(auth?: string) {
  if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();
  let claims: { sub?: string };
  try { claims = jwt.verify(auth.slice(7), secret!, {issuer:"quali-api",audience:"quali-admin"}) as {sub?: string}; }
  catch { throw new UnauthorizedException("Sessão inválida"); }
  if (!claims.sub) throw new UnauthorizedException();
  const user = await db.user.findUnique({where:{id:claims.sub},select:{id:true,role:true,active:true}});
  if (!user?.active) throw new UnauthorizedException();
  if (!["DEV","ADMIN"].includes(user.role)) throw new ForbiddenException("Acesso restrito à administração");
  return user;
}
const selection = {
  id:true,name:true,serviceType:true,services:true,address:true,city:true,
  phone:true,businessHours:true,discountPercent:true,active:true,createdAt:true,updatedAt:true,
} as const;

@Controller("partners")
export class PartnersController {
  @Get()
  async publicList(@Query("search") search?:string) {
    const keyword = typeof search === "string" ? search.trim().slice(0,80) : "";
    return db.partner.findMany({
      where:{active:true,...(keyword?{OR:[
        {name:{contains:keyword,mode:"insensitive" as const}},
        {city:{contains:keyword,mode:"insensitive" as const}},
        {services:{contains:keyword,mode:"insensitive" as const}},
      ]}:{})},
      select:selection,orderBy:{name:"asc"},take:300,
    });
  }
}

@Controller("admin/partners")
export class AdminPartnersController {
  @Get()
  async list(@Headers("authorization") auth?:string) {
    await requireStaff(auth);
    const start = new Date(); start.setDate(1);start.setHours(0,0,0,0);
    const [partners,grouped] = await Promise.all([
      db.partner.findMany({select:selection,orderBy:{name:"asc"},take:500}),
      db.attendance.groupBy({by:["partnerId"],where:{performedAt:{gte:start}},_count:{id:true}}),
    ]);
    const counts = new Map(grouped.map(item=>[item.partnerId,item._count.id]));
    return partners.map(item=>({...item,monthlyAttendances:counts.get(item.id)??0}));
  }

  @Post()
  async create(@Headers("authorization") auth:string|undefined,@Body() body:unknown){
    const actor=await requireStaff(auth);
    const input=parseInput(body);
    return db.$transaction(async tx=>{
      const partner=await tx.partner.create({data:input,select:selection});
      await tx.auditLog.create({data:{
        actorId:actor.id,action:"PARTNER_CREATED",entityType:"Partner",entityId:partner.id,
        metadata:{name:partner.name},
      }});
      return partner;
    });
  }

  @Patch(":id")
  async update(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:unknown){
    const actor=await requireStaff(auth);
    if(!/^[0-9a-fA-F-]{36}$/.test(id))throw new HttpException("Identificador inválido",400);
    const input=parseInput(body);
    return db.$transaction(async tx=>{
      const before=await tx.partner.findUnique({where:{id}});
      if(!before)throw new HttpException("Parceiro não encontrado",404);
      const partner=await tx.partner.update({where:{id},data:input,select:selection});
      await tx.auditLog.create({data:{
        actorId:actor.id,action:"PARTNER_UPDATED",entityType:"Partner",entityId:id,
        metadata:{name:partner.name,fields:Object.keys(input)},
      }});
      return partner;
    });
  }
}
