import { NextRequest, NextResponse } from "next/server";
export async function GET(request:NextRequest){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Não autenticado"},{status:401});
 try{
  const base=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${base}/admin/validations`,{
   headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
