import { NextRequest,NextResponse } from "next/server";
export async function POST(request:NextRequest){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Não autenticado"},{status:401});
 let body;try{body=await request.json();}catch{return NextResponse.json({error:"Requisição inválida"},{status:400});}
 try{
  const response=await fetch(`${process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1"}/admin/validate-cpf`,{method:"POST",headers:{"content-type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(8000)});
  return NextResponse.json(await response.json(),{status:response.status});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
