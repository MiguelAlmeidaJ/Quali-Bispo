import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import jwt from 'jsonwebtoken';
import { createPrismaClient } from '@quali/database';
import type { Request } from 'express';

loadEnv({ path: '../../.env' });
const db = createPrismaClient();
const secret = process.env.AUTH_JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
const limits = new Map<string,{count:number,reset:number}>();
type Claims = { sub:string; role:'ADMIN'|'PARTNER'|'BENEFICIARY'; username:string };
const unauthorized = () => new UnauthorizedException('Credenciais inválidas ou sessão expirada');
async function currentUser(auth?:string) {
  if (!auth?.startsWith('Bearer ')) throw unauthorized();
  let decoded:Claims;
  try { decoded = jwt.verify(auth.slice(7), secret!, { issuer: 'quali-api', audience: 'quali-admin' }) as Claims; } catch { throw unauthorized(); }
  if (!decoded.sub || !['ADMIN','PARTNER'].includes(decoded.role)) throw unauthorized();
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
    if(!user || !user.active || !['ADMIN','PARTNER'].includes(user.role) || !(await compare(body.password,user.passwordHash))) throw unauthorized();
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
    if(user.role!=='ADMIN') throw new HttpException('Acesso restrito',403);
    const [active,pending,inactive,people,partners,attendances]=await Promise.all([
      db.beneficiary.count({where:{status:'ACTIVE'}}),
      db.beneficiary.count({where:{status:'OVERDUE'}}),
      db.beneficiary.count({where:{status:'INACTIVE'}}),
      db.beneficiary.count(),
      db.partner.count({where:{active:true}}),
      db.attendance.count({where:{performedAt:{gte:new Date(new Date().getFullYear(),new Date().getMonth(),1)}}})
    ]);
    return {active,pending,inactive,people,partners,attendances,updatedAt:new Date().toISOString()};
  }
  @Post('validate-cpf')
  async validateCpf(@Headers('authorization') authorization:string|undefined,@Body() body:{cpf?:string}) {
    const user=await currentUser(authorization);
    const cpf=(body?.cpf||'').replace(/\D/g,'');
    if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) throw new HttpException('CPF inválido',400);
    let sum=0;for(let i=0;i<9;i++)sum+=Number(cpf[i])*(10-i);let digit=(sum*10)%11;if(digit===10)digit=0;
    if(digit!==Number(cpf[9])) throw new HttpException('CPF inválido',400);
    sum=0;for(let i=0;i<10;i++)sum+=Number(cpf[i])*(11-i);digit=(sum*10)%11;if(digit===10)digit=0;
    if(digit!==Number(cpf[10])) throw new HttpException('CPF inválido',400);
    const crypto=await import('node:crypto');
    const pepper=process.env.CPF_HASH_KEY;
    if(!pepper || pepper.length<32) throw new Error('CPF_HASH_KEY not configured');
    const cpfHash=crypto.createHmac('sha256',pepper).update(cpf).digest('hex');
    const person=await db.beneficiary.findUnique({where:{cpfHash},select:{id:true,name:true,status:true,plan:{select:{name:true}}}});
    await db.auditLog.create({data:{actorId:user.id,action:'CPF_LOOKUP',entityType:'Beneficiary',entityId:person?.id,metadata:{matched:!!person,lastDigits:cpf.slice(-2)}}});
    return {found:!!person,beneficiary:person?{name:person.name,status:person.status,plan:person.plan?.name??null}:null};
  }
}
