import { NextRequest, NextResponse } from "next/server";

const api = process.env.INTERNAL_API_URL || "http://127.0.0.1:4002/v1";
async function handler(request:NextRequest,method:"GET"|"POST"){
  const token=request.cookies.get("quali_session")?.value;
  if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
  if(method!=="GET" && request.headers.has("sec-fetch-site") &&
      !["same-origin","none"].includes(request.headers.get("sec-fetch-site")!)){
    return NextResponse.json({error:"Origem não permitida"},{status:403});
  }
  let body:string|undefined;
  if(method==="POST"){
    try{body=JSON.stringify(await request.json());}
    catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
    if(body.length>8000)return NextResponse.json({error:"Dados muito extensos"},{status:413});
  }
  try{
    const response=await fetch(`${api}/admin/partners`,{
      method,
      headers:{Authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},
      body,cache:"no-store",signal:AbortSignal.timeout(10000),
    });
    return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
  }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
export function GET(request:NextRequest){return handler(request,"GET")}
export function POST(request:NextRequest){return handler(request,"POST")}
