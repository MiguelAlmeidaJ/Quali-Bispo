import {NextRequest,NextResponse} from "next/server";
const kinds=new Set(["customers","attendances","consultations","delinquents","validations","payments"]);
export async function GET(request:NextRequest,{params}:{params:Promise<{kind:string}>}){
 const {kind}=await params;
 if(!kinds.has(kind))return NextResponse.json({error:"Tipo de relatório inválido"},{status:404});
 const month=request.nextUrl.searchParams.get("month")||"";
 if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
  return NextResponse.json({error:"Mês inválido"},{status:400});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Autenticação necessária"},{status:401});
 try{
  const base=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${base}/admin/reports/${kind}${month?`?month=${month}`:""}`,{
   headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(60000)});
  if(!response.ok){
   const error=await response.json().catch(()=>({error:"Falha na exportação"}));
   return NextResponse.json(error,{status:response.status,headers:{"cache-control":"no-store"}});
  }
  const body=await response.arrayBuffer();
  return new Response(body,{status:200,headers:{
   "content-type":"text/csv; charset=utf-8",
   "content-disposition":`attachment; filename="quali-${kind}${["attendances","consultations"].includes(kind)?`-${month||"mes-atual"}`:""}.csv"`,
   "cache-control":"private, no-store",
   "x-content-type-options":"nosniff",
  }});
 }catch{return NextResponse.json({error:"API indisponível ou exportação excedeu o tempo limite"},{status:503});}
}
