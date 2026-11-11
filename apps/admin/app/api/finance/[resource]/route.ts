import {NextRequest,NextResponse} from "next/server";
const permitted=new Set(["summary","customers","issues"]);
export async function GET(request:NextRequest,context:{params:Promise<{resource:string}>}){
 const {resource}=await context.params;
 if(!permitted.has(resource))return NextResponse.json({error:"Recurso inválido"},{status:404});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Autenticação necessária"},{status:401});
 const endpoint=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
 const url=new URL(`${endpoint}/admin/finance/${resource}`);
 for(const key of ["page","search","status","unresolved"]){
  const value=request.nextUrl.searchParams.get(key);
  if(value)url.searchParams.set(key,value.slice(0,120));
 }
 try{
  const response=await fetch(url,{headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}

export async function POST(request:NextRequest,context:{params:Promise<{resource:string}>}){
 const {resource}=await context.params;
 if(resource!=="customers")return NextResponse.json({error:"Recurso inválido"},{status:404});
 if(request.headers.has("sec-fetch-site")&&!["same-origin","none"].includes(request.headers.get("sec-fetch-site")!))
  return NextResponse.json({error:"Origem não permitida"},{status:403});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Autenticação necessária"},{status:401});
 let body:string;
 try{body=JSON.stringify(await request.json());}
 catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
 if(body.length>6000)return NextResponse.json({error:"Dados muito extensos"},{status:413});
 try{
  const endpoint=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${endpoint}/admin/finance/customers`,{
   method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
   body,cache:"no-store",signal:AbortSignal.timeout(10000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
