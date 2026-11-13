import {NextRequest,NextResponse} from "next/server";

export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Não autenticado"},{status:401});
 const page=request.nextUrl.searchParams.get("page")||"1";
 const search=request.nextUrl.searchParams.get("search")||"";
 const query=new URLSearchParams({page,search});
 try{
  const base=(process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1").replace(/\/$/,"");
  const response=await fetch(base+"/admin/customer-benefits/incomplete?"+query.toString(),{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)});
  const data=await response.json();
  return NextResponse.json(data,{status:response.status,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Falha ao consultar pendências de clientes"},{status:503});}
}
