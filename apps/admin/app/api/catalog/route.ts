import {NextRequest,NextResponse} from "next/server";
async function handler(request:NextRequest,method:"GET"|"POST"){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
 if(method!=="GET"&&request.headers.has("sec-fetch-site")&&!["same-origin","none"].includes(request.headers.get("sec-fetch-site")!))
  return NextResponse.json({error:"Origem inválida"},{status:403});
 let body:string|undefined;
 if(method==="POST"){
  try{body=JSON.stringify(await request.json());}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>7000)return NextResponse.json({error:"Dados extensos"},{status:413});
 }
 try{
  const api=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const r=await fetch(`${api}/admin/catalog`,{method,headers:{authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},body,cache:"no-store",signal:AbortSignal.timeout(10000)});
  return NextResponse.json(await r.json(),{status:r.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
export const GET=(req:NextRequest)=>handler(req,"GET");
export const POST=(req:NextRequest)=>handler(req,"POST");
