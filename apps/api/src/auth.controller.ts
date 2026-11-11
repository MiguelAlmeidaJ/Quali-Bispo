import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import jwt from 'jsonwebtoken';
import { createPrismaClient } from '@quali/database';
import { cpfFingerprint, validCpf } from './finance-customer.validation';
import type { Request } from 'express';

loadEnv({ path: '../../.env' });
const db = createPrismaClient();
const secret = process.env.AUTH_JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
const limits = new Map<string,{count:number,reset:number}>();
type Claims = { sub:string; role:'DEV'|'ADMIN'|'PARTNER'|'BENEFICIARY'; username:string };
const unauthorized = () => new UnauthorizedException('Credenciais inválidas ou sessão expirada');
export async function currentUser(auth?:string) {
  if (!auth?.startsWith('Bearer ')) throw unauthorized();
  let decoded:Claims;
  try { decoded = jwt.verify(auth.slice(7), secret!, { issuer: 'quali-api', audience: 'quali-admin' }) as Claims; } catch { throw unauthorized(); }
  if (!decoded.sub || !['DEV','ADMIN','PARTNER'].includes(decoded.role)) throw unauthorized();
  const user = await db.user.findUnique({where:{id:decoded.sub},select:{id:true,name:true,username:true,role:true,active:true,partnerId:true}});
  if (!user?.active || user.role !== decoded.role) throw unauthorized();
  return user;
}
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() body:{username?:string;password?:string},@Req() request:Request) {
    const key=request.ip || 'unknown';const now=Date.now();
    if (limits.size>5000) limits.clear();
    const entry=limits.get(key);
    if(entry && entry.reset>now && entry.count>=10) throw new HttpException('Muitas tentativas. Tente mais tarde.',HttpStatus.TOO_MANY_REQUESTS);
    if(!entry || entry.reset<=now) limits.set(key,{count:1,reset:now+15*60_000});else entry.count++;
    if(typeof body?.username!=='string'||typeof body?.password!=='string'||body.username.length>80||body.password.length>128) throw unauthorized();
    const user=await db.user.findUnique({where:{username:body.username.trim().toLowerCase()}});
    if(!user || !user.active || !['DEV','ADMIN','PARTNER'].includes(user.role) || !(await compare(body.password,user.passwordHash))) throw unauthorized();
    limits.delete(key);
    const token=jwt.sign({role:user.role,username:user.username},secret!,{subject:user.id,expiresIn:'8h',issuer:'quali-api',audience:'quali-admin'});
    return {token,user:{id:user.id,name:user.name,username:user.username,role:user.role}};
  }
  @Get('me')
  async me(@Headers('authorization') authorization?:string) {
    const u=await currentUser(authorization);return {id:u.id,name:u.name,username:u.username,role:u.role};
  }
}
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  async dashboard(@Headers('authorization') authorization?:string) {
    const user=await currentUser(authorization);
    if(!['DEV','ADMIN'].includes(user.role)) throw new HttpException('Acesso restrito',403);
    const [active,pending,inactive,people,partners,attendances,financeCustomers,financePaid,financeOpen,financeUnresolved]=await Promise.all([
      db.beneficiary.count({where:{status:'ACTIVE'}}),
      db.beneficiary.count({where:{status:'OVERDUE'}}),
      db.beneficiary.count({where:{status:'INACTIVE'}}),
      db.beneficiary.count(),
      db.partner.count({where:{active:true}}),
      db.financeAttendance.count({where:{voidedAt:null,performedAt:{gte:new Date(new Date().getFullYear(),new Date().getMonth(),1)}}}),
      db.financeCustomer.count(),
      db.financeCustomer.count({where:{status:'PAID'}}),
      db.financeCustomer.count({where:{status:'OPEN'}}),
      db.financeIssue.count({where:{resolved:false}})
    ]);
    return {active,pending,inactive,people,partners,attendances,financeCustomers,financePaid,financeOpen,financeUnresolved,updatedAt:new Date().toISOString()};
  }
  @Get('validations')
  async validations(@Headers('authorization') authorization?:string){
    const actor=await currentUser(authorization);
    const admin=actor.role==='DEV'||actor.role==='ADMIN';
    const rows=await db.auditLog.findMany({
      where:{action:'CPF_LOOKUP',...(admin?{}:{actorId:actor.id})},
      orderBy:{createdAt:'desc'},take:15,
      select:{id:true,createdAt:true,metadata:true,actor:{select:{name:true}}},
    });
    return rows.map(item=>{
      const meta=item.metadata&&typeof item.metadata==='object'&&!Array.isArray(item.metadata)
        ?item.metadata as Record<string,unknown>:{};
      return {id:item.id,at:item.createdAt,actor:item.actor?.name||'Sistema',
        matched:meta.matched===true,eligible:meta.eligible===true,
        source:typeof meta.source==='string'?meta.source:null};
    });
  }
  @Post('validate-cpf')
  async validateCpf(@Headers('authorization') authorization:string|undefined,@Body() body:{cpf?:string}) {
    const user=await currentUser(authorization);
    const cpf=typeof body?.cpf==="string"?body.cpf.replace(/\D/g,""):"";
    if(!validCpf(cpf))throw new HttpException("CPF inválido",400);
    const cpfHash=cpfFingerprint(cpf);
    const [beneficiary,financial]=await Promise.all([
      db.beneficiary.findUnique({where:{cpfHash},select:{id:true,name:true,status:true,plan:{select:{name:true}}}}),
      db.financeCustomer.findMany({where:{cpfHash,cpfValid:true,cpfConflict:false},
        select:{id:true,name:true,status:true,planType:true,partner:{select:{name:true}}},take:2}),
    ]);
    const customer=financial.length===1?financial[0]:null;
    // O controle financeiro pode confirmar o cadastro, mas só situação PAID libera o uso.
    // Registros sem hash confiável ou duplicados devem ser corrigidos antes da liberação.
    const found=!!beneficiary||!!customer;
    const eligible=beneficiary?.status==="ACTIVE"||(!beneficiary&&customer?.status==="PAID");
    const matchedCustomer=customer&&!beneficiary;
    await db.auditLog.create({data:{
      actorId:user.id,action:"CPF_LOOKUP",entityType:beneficiary?"Beneficiary":"FinanceCustomer",
      entityId:beneficiary?.id||customer?.id,
      metadata:{matched:found,eligible:!!eligible,source:beneficiary?"beneficiary":customer?"finance":"none"},
    }});
    return {
      found,eligible:!!eligible,
      source:beneficiary?"beneficiary":matchedCustomer?"finance":null,
      beneficiary:beneficiary?{name:beneficiary.name,status:beneficiary.status,plan:beneficiary.plan?.name??null}:
        customer?{name:customer.name,status:customer.status==="PAID"?"ACTIVE":"OVERDUE",
          plan:customer.planType}:null,
      customer:matchedCustomer?{id:customer.id,name:customer.name,status:customer.status,
        plan:customer.planType,unit:customer.partner?.name??null}:null,
      message:!found?"CPF não encontrado no cadastro.":eligible?"Acesso liberado.":"Cadastro localizado, mas acesso não liberado. Verifique a situação financeira.",
    };
  }
}
