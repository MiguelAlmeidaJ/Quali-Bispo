import {NextRequest,NextResponse} from "next/server";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(id!=="options"&&id!=="customers")return NextResponse.json({error:"Recurso inválido"},{status:404});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
 const endpoint=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
 const q=id==="customers"?(request.nextUrl.searchParams.get("q")||"").slice(0,100):"";
 try{
  const r=await fetch(`${endpoint}/admin/attendances/${id}${q?`?q=${encodeURIComponent(q)}`:""}`,{
   headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
  return NextResponse.json(await r.json(),{status:r.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
