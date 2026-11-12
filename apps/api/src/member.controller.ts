import { Body, Controller, Get, Headers, HttpException, Post, Req, UnauthorizedException } from "@nestjs/common";
import { createPrismaClient } from "@quali/database";
import { createHmac } from "node:crypto";
import { config as loadEnv } from "dotenv";
import jwt from "jsonwebtoken";
import type { Request } from "express";
import { cpfFingerprint, validCpf } from "./finance-customer.validation";

loadEnv({path:"../../.env"});
const db=createPrismaClient();
const secret=process.env.AUTH_JWT_SECRET;
if(!secret||secret.length<32)throw new Error("AUTH_JWT_SECRET deve conter 32 caracteres.");
const issuer="quali-member",audience="quali-member-portal";
const attempts=new Map<string,{count:number;until:number}>();
const generic="Não foi possível confirmar seus dados. Confira CPF e nascimento ou procure o atendimento Quali.";
const birthDate=(raw:unknown):string|null=>{
 if(typeof raw!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(raw))return null;
 const date=new Date(raw+"T00:00:00.000Z");
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==raw||date.getTime()>Date.now())return null;
 return raw;
};
function verifySession(auth?:string):string{
 if(!auth?.startsWith("Bearer "))throw new UnauthorizedException("Sessão necessária");
 try{
  const claims=jwt.verify(auth.slice(7),secret!,{issuer,audience}) as jwt.JwtPayload;
  if(typeof claims.sub!=="string")throw new Error("Sessão inválida");
  return claims.sub;
 }catch{throw new UnauthorizedException("Sessão expirada ou inválida");}
}
const selectMember={
 id:true,name:true,cpfLast4:true,birthDate:true,planType:true,amountCents:true,cardNumber:true,
 cardPlan:{select:{name:true,priceCents:true,maxDependents:true,benefits:true}},
 dependents:{select:{id:true,name:true,cpfLast4:true,birthDate:true,cardNumber:true},orderBy:{createdAt:"asc"}},
 status:true,partner:{select:{id:true,name:true,city:true}},unit:true,
 createdAt:true,referenceDate:true,cpfValid:true,cpfConflict:true,
} as const;

@Controller("member")
export class MemberController{
 @Post("login")
 async login(@Body() input:{cpf?:unknown;birthDate?:unknown},@Req() request:Request){
  const cpf=typeof input?.cpf==="string"?input.cpf.replace(/\D/g,""):"";
  const birth=birthDate(input?.birthDate);
  // Combinação pseudonimizada de IP e CPF, sem registrar o CPF nos logs.
  const throttleKey=createHmac("sha256",secret!).update((request.ip||"unknown")+":"+cpf).digest("hex");
  const now=Date.now();
  if(attempts.size>20000)attempts.clear();
  const attempt=attempts.get(throttleKey);
  if(attempt&&attempt.until>now&&attempt.count>=5)throw new HttpException("Muitas tentativas. Tente novamente mais tarde.",429);
  if(!attempt||attempt.until<=now)attempts.set(throttleKey,{count:1,until:now+15*60*1000});
  else attempt.count++;
  if(!validCpf(cpf)||!birth)throw new UnauthorizedException(generic);
  const fingerprint=cpfFingerprint(cpf);
  const records=await db.financeCustomer.findMany({
   where:{cpfHash:fingerprint,cpfValid:true,cpfConflict:false},
   select:{id:true,birthDate:true},take:2,
  });
  if(records.length!==1||records[0].birthDate?.toISOString().slice(0,10)!==birth)
   throw new UnauthorizedException(generic);
  const id=records[0].id;
  attempts.delete(throttleKey);
  await db.auditLog.create({data:{action:"MEMBER_LOGIN_SUCCESS",entityType:"FinanceCustomer",
    entityId:id,metadata:{source:"member-portal"}}});
  const token=jwt.sign({purpose:"member"},secret!,{
   subject:id,issuer,audience,expiresIn:"2h",
  });
  return {token,expiresInSeconds:7200};
 }
 @Get("me")
 async me(@Headers("authorization") auth?:string){
  const id=verifySession(auth);
  const member=await db.financeCustomer.findUnique({where:{id},select:selectMember});
  if(!member||!member.cpfValid||member.cpfConflict||!member.birthDate)
   throw new UnauthorizedException("Cadastro indisponível. Procure a central Quali.");
  return {
   id:member.id,name:member.name,cpfLast4:member.cpfLast4,cardNumber:member.cardNumber,
   dependents:member.dependents,cardPlan:member.cardPlan,
   birthDate:member.birthDate,planType:member.planType,amountCents:member.amountCents,
   status:member.status,partner:member.partner,unit:member.partner?.name||member.unit,
   joinedAt:member.createdAt,referenceDate:member.referenceDate,
  };
 }
 @Get("dashboard")
 async dashboard(@Headers("authorization") auth?:string){
  const id=verifySession(auth);
  const member=await db.financeCustomer.findUnique({where:{id},select:selectMember});
  if(!member||!member.cpfValid||member.cpfConflict||!member.birthDate)
   throw new UnauthorizedException("Cadastro indisponível. Procure a central Quali.");
  const today=new Date(),start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1));
  const next=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+1,1));
  const [attendances,consultations,savings,attendanceCount,issues,partners,catalog]=await Promise.all([
   db.financeAttendance.findMany({where:{customerId:id,voidedAt:null},orderBy:{performedAt:"desc"},
    take:100,select:{id:true,performedAt:true,serviceName:true,serviceType:true,
     fullPriceCents:true,chargedCents:true,partner:{select:{name:true}}}}),
   db.financeAttendance.count({where:{customerId:id,voidedAt:null,serviceType:"CONSULTA",
    performedAt:{gte:start,lt:next}}}),
   db.financeAttendance.aggregate({where:{customerId:id,voidedAt:null},
    _sum:{fullPriceCents:true,chargedCents:true}}),
   db.financeAttendance.count({where:{customerId:id,voidedAt:null}}),
   db.financeIssue.findMany({where:{customerId:id,resolved:false},orderBy:{createdAt:"desc"},take:30,
    select:{id:true,rawStatus:true,status:true,amountCents:true,referenceDate:true,paymentMethod:true}}),
   db.partner.findMany({where:{active:true},orderBy:{name:"asc"},take:100,
    select:{id:true,name:true,city:true,address:true,phone:true,businessHours:true,
     serviceType:true,serviceTypes:true,services:true,discountPercent:true}}),
   db.catalogItem.findMany({where:{active:true},orderBy:[{displayOrder:"asc"},{name:"asc"}],take:500,
    select:{id:true,name:true,category:true,group:true,normalPriceCents:true,qualiPriceCents:true,professional:true}}),
  ]);
  const saved=(savings._sum.fullPriceCents||0)-(savings._sum.chargedCents||0);
  return {
   member:{name:member.name,cpfLast4:member.cpfLast4,birthDate:member.birthDate,
    cardNumber:member.cardNumber,cardPlan:member.cardPlan,
    planType:member.planType,amountCents:member.amountCents,status:member.status,
    unit:member.partner?.name||member.unit,joinedAt:member.createdAt,
    referenceDate:member.referenceDate},
   consultationsThisMonth:consultations,savingsCents:saved,attendances,issues,partners,catalog,
   attendanceTotals:{count:attendanceCount,fullPriceCents:savings._sum.fullPriceCents||0,
    chargedCents:savings._sum.chargedCents||0,savingsCents:saved},
   // Dados não registrados de forma confiável na base financeira.
   dependentsAvailable:member.dependents.length>0,dependents:member.dependents,
   cardNumber:member.cardNumber,phone:null,nextDueDate:null,
   consultationLimit:null,
  };
 }
}
