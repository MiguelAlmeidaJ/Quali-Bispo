import {NextRequest,NextResponse} from "next/server";

export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Não autenticado"},{status:401});
 try{
  const base=(process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1").replace(/\/$/,"");
  const response=await fetch(base+"/admin/customer-benefits/issue-only/count",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)});
  const body=await response.json();
  return NextResponse.json(body,{status:response.status,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Não foi possível consultar cartões elegíveis"},{status:503});}
}
