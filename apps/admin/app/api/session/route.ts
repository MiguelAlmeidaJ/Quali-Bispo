import { NextRequest, NextResponse } from "next/server";
const API=process.env.INTERNAL_API_URL || "http://127.0.0.1:4002/v1";
const cookie="quali_session";
export async function POST(request:NextRequest){
 let data:unknown;try{data=await request.json();}catch{return NextResponse.json({error:"Requisição inválida"},{status:400});}
 try {
  const response=await fetch(`${API}/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!response.ok)return NextResponse.json({error:response.status===429?"Muitas tentativas. Tente novamente mais tarde.":"Usuário ou senha inválidos."},{status:response.status===429?429:401});
  const body=await response.json() as {token:string;user:unknown};
  const result=NextResponse.json({user:body.user});
  result.cookies.set(cookie,body.token,{httpOnly:true,secure:process.env.NODE_ENV==="production"&&process.env.COOKIE_SECURE==="true",sameSite:"lax",path:"/admin",maxAge:8*60*60});
  return result;
 } catch{return NextResponse.json({error:"API temporariamente indisponível"},{status:503});}
}
export async function GET(request:NextRequest){
 const token=request.cookies.get(cookie)?.value;
 if(!token)return NextResponse.json({error:"Sem sessão"},{status:401});
 try{
  const response=await fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!response.ok)return NextResponse.json({error:"Sessão expirada"},{status:401});
  return NextResponse.json({user:await response.json()});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
export async function DELETE(){
 const response=NextResponse.json({ok:true});response.cookies.delete(cookie);return response;
}
