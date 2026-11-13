import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
async function proxy(request:NextRequest,method:"GET"|"PUT"){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
 let body:string|undefined;
 if(method==="PUT"){
  if(request.headers.has("sec-fetch-site")&&!["same-origin","none"].includes(request.headers.get("sec-fetch-site")!))
   return NextResponse.json({error:"Origem não permitida"},{status:403});
  try{body=JSON.stringify(await request.json());}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>400)return NextResponse.json({error:"Configuração extensa demais"},{status:413});
 }
 try{
  const base=(process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1").replace(/\/$/,"");
  const response=await fetch(base+"/admin/billing-settings/due-days",{
   method,headers:{authorization:"Bearer "+token,...(body?{"content-type":"application/json"}:{})},
   body,cache:"no-store",signal:AbortSignal.timeout(12000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Não foi possível acessar as configurações"},{status:503});}
}
export const GET=(request:NextRequest)=>proxy(request,"GET");
export const PUT=(request:NextRequest)=>proxy(request,"PUT");
