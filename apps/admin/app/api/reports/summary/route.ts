import {NextRequest,NextResponse} from "next/server";
export async function GET(request:NextRequest){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Autenticação necessária"},{status:401});
 const month=request.nextUrl.searchParams.get("month")||"";
 if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
  return NextResponse.json({error:"Mês inválido"},{status:400});
 try{
  const base=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${base}/admin/reports/summary${month?`?month=${month}`:""}`,{
   headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(12000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
