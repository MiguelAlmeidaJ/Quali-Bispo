import { Body, Controller, Get, Headers, HttpException, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { createPrismaClient } from "@quali/database";
import { createHmac } from "node:crypto";
import { config as loadEnv } from "dotenv";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { makeMemberCardPdf } from "./member-card-pdf";
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
function verifySession(auth?:string):{id:string;kind:"holder"|"dependent"}{
 if(!auth?.startsWith("Bearer "))throw new UnauthorizedException("Sessão necessária");
 try{
  const claims=jwt.verify(auth.slice(7),secret!,{issuer,audience}) as jwt.JwtPayload;
  if(typeof claims.sub!=="string")throw new Error("Sessão inválida");
  if(claims.purpose!=="member"&&claims.purpose!=="dependent")throw new UnauthorizedException("Sessão inválida");
  return {id:claims.sub,kind:claims.purpose==="dependent"?"dependent":"holder"};
 }catch{throw new UnauthorizedException("Sessão expirada ou inválida");}
}
const selectMember={
 id:true,name:true,cpfLast4:true,birthDate:true,benefitActive:true,planType:true,amountCents:true,cardNumber:true,
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
  const [holders,children]=await Promise.all([
   db.financeCustomer.findMany({where:{cpfHash:fingerprint,cpfValid:true,cpfConflict:false,benefitActive:true},
    select:{id:true,birthDate:true},take:2}),
   db.cardDependent.findMany({where:{cpfHash:fingerprint,benefitActive:true,
    customer:{benefitActive:true,cpfValid:true,cpfConflict:false}},
    select:{id:true,birthDate:true},take:2}),
  ]);
  const matches=[
   ...holders.filter(item=>item.birthDate?.toISOString().slice(0,10)===birth).map(item=>({id:item.id,kind:"member" as const})),
   ...children.filter(item=>item.birthDate.toISOString().slice(0,10)===birth).map(item=>({id:item.id,kind:"dependent" as const})),
  ];
  if(matches.length!==1)throw new UnauthorizedException(generic);
  const {id,kind}=matches[0];
  attempts.delete(throttleKey);
  await db.auditLog.create({data:{action:"MEMBER_LOGIN_SUCCESS",entityType:kind==="member"?"FinanceCustomer":"CardDependent",
    entityId:id,metadata:{source:"member-portal"}}});
  const token=jwt.sign({purpose:kind},secret!,{
   subject:id,issuer,audience,expiresIn:"2h",
  });
  return {token,expiresInSeconds:7200};
 }
 @Get("me")
 async me(@Headers("authorization") auth?:string){
  const session=verifySession(auth);
  if(session.kind==="dependent"){
   const dep=await db.cardDependent.findUnique({where:{id:session.id},
    select:{id:true,name:true,cpfLast4:true,birthDate:true,cardNumber:true,benefitActive:true,
     customer:{select:{benefitActive:true,cpfValid:true,cpfConflict:true,status:true,cardPlan:true,partner:true,unit:true}}}});
   if(!dep?.benefitActive||!dep.customer.benefitActive||dep.customer.cpfConflict||!dep.customer.cpfValid)
    throw new UnauthorizedException("Benefício indisponível");
   return {id:dep.id,name:dep.name,cpfLast4:dep.cpfLast4,cardNumber:dep.cardNumber,
    birthDate:dep.birthDate,role:"dependent",cardPlan:dep.customer.cardPlan};
  }
  const id=session.id;
  const member=await db.financeCustomer.findUnique({where:{id},select:selectMember});
  if(!member||!member.cpfValid||member.cpfConflict||!member.birthDate||!member.benefitActive)
   throw new UnauthorizedException("Cadastro indisponível. Procure a central Quali.");
  return {
   id:member.id,name:member.name,cpfLast4:member.cpfLast4,cardNumber:member.cardNumber,
   dependents:member.dependents,cardPlan:member.cardPlan,
   birthDate:member.birthDate,planType:member.planType,amountCents:member.amountCents,
   status:member.status,partner:member.partner,unit:member.partner?.name||member.unit,
   joinedAt:member.createdAt,referenceDate:member.referenceDate,
  };
 }
 @Get("card.pdf")
 async downloadCard(@Headers("authorization") auth:string|undefined,@Res() response:Response){
  // Mesmo JWT dedicado ao associado; nunca aceitar token de ADMIN/PARTNER.
  const session=verifySession(auth);
  let name:string,cardNumber:string|null,cpfLast4:string|null,birthDate:Date|null;
  let relationship:"Titular"|"Dependente"="Titular";
  if(session.kind==="dependent"){
   const dep=await db.cardDependent.findUnique({where:{id:session.id},
    select:{name:true,cardNumber:true,cpfLast4:true,birthDate:true,benefitActive:true,
     customer:{select:{benefitActive:true,cpfValid:true,cpfConflict:true}}}});
   if(!dep?.benefitActive||!dep.customer.benefitActive||!dep.customer.cpfValid||dep.customer.cpfConflict)
    throw new UnauthorizedException("Benefício indisponível");
   ({name,cardNumber,cpfLast4,birthDate}=dep);
   relationship="Dependente";
  }else{
   const holder=await db.financeCustomer.findUnique({where:{id:session.id},
    select:{name:true,cardNumber:true,cpfLast4:true,birthDate:true,cpfValid:true,cpfConflict:true,benefitActive:true}});
   if(!holder||!holder.cpfValid||holder.cpfConflict||!holder.birthDate||!holder.benefitActive)
    throw new UnauthorizedException("Cadastro indisponível. Procure a central Quali.");
   ({name,cardNumber,cpfLast4,birthDate}=holder);
  }
  if(!cardNumber||!cpfLast4||!birthDate)
   throw new HttpException("Cartão ainda não emitido. Regularize o cadastro.",409);
  const pdf=await makeMemberCardPdf({name,number:cardNumber,cpfLast4,birthDate,relationship});
  response.setHeader("Content-Type","application/pdf");
  response.setHeader("Content-Disposition",`attachment; filename="quali-cartao-${cardNumber}.pdf"`);
  response.setHeader("Cache-Control","private, no-store, max-age=0");
  response.setHeader("X-Content-Type-Options","nosniff");
  response.end(pdf);
 }
 @Get("dashboard")
 async dashboard(@Headers("authorization") auth?:string){
  const session=verifySession(auth);
  if(session.kind==="dependent"){
   const dep=await db.cardDependent.findUnique({where:{id:session.id},
    select:{id:true,name:true,cpfLast4:true,birthDate:true,cardNumber:true,createdAt:true,benefitActive:true,
     customer:{select:{benefitActive:true,cpfValid:true,cpfConflict:true,status:true,planType:true,
      cardPlan:{select:{name:true,priceCents:true,maxDependents:true,benefits:true}},
      partner:{select:{name:true}},unit:true}}}});
   if(!dep?.benefitActive||!dep.customer.benefitActive||!dep.customer.cpfValid||dep.customer.cpfConflict)
    throw new UnauthorizedException("Benefício cancelado ou cadastro indisponível.");
   const [partners,catalog]=await Promise.all([
    db.partner.findMany({where:{active:true},orderBy:{name:"asc"},take:100,
     select:{id:true,name:true,city:true,address:true,phone:true,businessHours:true,
      serviceType:true,serviceTypes:true,services:true,discountPercent:true}}),
    db.catalogItem.findMany({where:{active:true},orderBy:[{displayOrder:"asc"},{name:"asc"}],take:500,
     select:{id:true,name:true,category:true,group:true,normalPriceCents:true,qualiPriceCents:true,professional:true}}),
   ]);
   return {accessKind:"dependent",
    member:{name:dep.name,cpfLast4:dep.cpfLast4,birthDate:dep.birthDate,
     cardNumber:dep.cardNumber,cardPlan:dep.customer.cardPlan,planType:dep.customer.planType,
     amountCents:null,status:dep.customer.status,unit:dep.customer.partner?.name||dep.customer.unit,
     joinedAt:dep.createdAt,referenceDate:null},
    consultationsThisMonth:0,savingsCents:0,
    attendances:[],issues:[],partners,catalog,
    attendanceTotals:{count:0,fullPriceCents:0,chargedCents:0,savingsCents:0},
    dependentsAvailable:false,dependents:[],cardNumber:dep.cardNumber,phone:null,nextDueDate:null,consultationLimit:null};
  }
  const id=session.id;
  const member=await db.financeCustomer.findUnique({where:{id},select:selectMember});
  if(!member||!member.cpfValid||member.cpfConflict||!member.birthDate||!member.benefitActive)
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
   accessKind:"holder",
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
