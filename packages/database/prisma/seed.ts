import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { hash } from 'bcryptjs';
import { createPrismaClient } from '../src/index';

config({path:fileURLToPath(new URL('../../../.env',import.meta.url))});
async function main(){
 const adminPassword=process.env.SEED_ADMIN_PASSWORD;
 const partnerPassword=process.env.SEED_PARTNER_PASSWORD;
 if(!adminPassword || !partnerPassword || adminPassword.length<8 || partnerPassword.length<8){
   throw new Error('Set SEED_ADMIN_PASSWORD and SEED_PARTNER_PASSWORD (8+ chars) in the root .env before running seed.');
 }
 const devPassword=process.env.SEED_DEV_PASSWORD;
 if (devPassword && devPassword.length<12) throw new Error('SEED_DEV_PASSWORD must contain 12+ characters');
 const db=createPrismaClient();
 try{
  const partner=await db.partner.upsert({where:{id:'11111111-1111-4111-8111-111111111111'},update:{},create:{id:'11111111-1111-4111-8111-111111111111',name:'Parceiro de demonstração'}});
  for(const u of [{username:'admin',name:'Administrador',role:'ADMIN' as const,password:adminPassword,email:'admin@local.invalid',partnerId:null},
   {username:'parceiro',name:'Parceiro credenciado',role:'PARTNER' as const,password:partnerPassword,email:'parceiro@local.invalid',partnerId:partner.id}]){
    await db.user.upsert({where:{username:u.username},update:{passwordHash:await hash(u.password,12),active:true},create:{username:u.username,name:u.name,email:u.email,role:u.role,partnerId:u.partnerId,passwordHash:await hash(u.password,12)}});
  }
  if (devPassword) {
    const existing = await db.user.findUnique({where:{username:"dev"}});
    if (!existing) {
      const created = await db.user.create({data:{username:"dev",name:"Desenvolvedor Quali",email:"dev@local.invalid",role:"DEV",active:true,passwordHash:await hash(devPassword,12)}});
      await db.auditLog.create({data:{actorId:created.id,action:"DEV_BOOTSTRAP",entityType:"User",entityId:created.id}});
    } else if (existing.role !== "DEV") {
      throw new Error("Username dev already exists with a different role");
    }
  }
  console.log('Contas admin e parceiro atualizadas; DEV criado apenas se ausente e SEED_DEV_PASSWORD configurada.');
 } finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
