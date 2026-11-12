import {NextRequest,NextResponse} from "next/server";
const base=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
async function forward(request:NextRequest,method:"GET"|"POST"){
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sem sessão"},{status:401});
 let body:string|undefined;
 if(method==="POST"){
  if(request.headers.has("sec-fetch-site")&&!["same-origin","none"].includes(request.headers.get("sec-fetch-site")!))
   return NextResponse.json({error:"Origem não permitida"},{status:403});
  try{body=JSON.stringify(await request.json());}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>6000)return NextResponse.json({error:"Dados muito extensos"},{status:413});
 }
 try{
  const response=await fetch(`${base}/admin/card-plans`,{method,
   headers:{authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},
   body,cache:"no-store",signal:AbortSignal.timeout(12000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
export function GET(request:NextRequest){return forward(request,"GET");}
export function POST(request:NextRequest){return forward(request,"POST");}
