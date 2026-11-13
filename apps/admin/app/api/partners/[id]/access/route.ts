import {NextRequest,NextResponse} from "next/server";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 return forward(request,params,"GET");
}
export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 return forward(request,params,"PUT");
}
async function forward(request:NextRequest,params:Promise<{id:string}>,method:"GET"|"PUT"){
 const {id}=await params;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))
  return NextResponse.json({error:"Unidade inválida"},{status:400});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
 let body:string|undefined;
 if(method==="PUT"){
  const site=request.headers.get("sec-fetch-site");
  if(site&&!["same-origin","none"].includes(site))return NextResponse.json({error:"Origem inválida"},{status:403});
  try{body=JSON.stringify(await request.json());}
  catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>3000)return NextResponse.json({error:"Dados extensos"},{status:413});
 }
 try{
  const api=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${api}/admin/partners/${id}/access`,{
   method,headers:{authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},
   body,cache:"no-store",signal:AbortSignal.timeout(12000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
