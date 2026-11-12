import {NextRequest,NextResponse} from "next/server";
export async function GET(request:NextRequest,ctx:{params:Promise<{resource:string}>}){
 return forward(request,ctx,"GET");
}
export async function PATCH(request:NextRequest,ctx:{params:Promise<{resource:string}>}){
 return forward(request,ctx,"PATCH");
}
async function forward(request:NextRequest,ctx:{params:Promise<{resource:string}>},method:"GET"|"PATCH"){
 const {resource}=await ctx.params;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(method==="GET"&&!["check-cpf","incomplete"].includes(resource)||
    method==="PATCH"&&!uuid.test(resource))
  return NextResponse.json({error:"Rota inválida"},{status:404});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Autenticação necessária"},{status:401});
 let body:string|undefined;
 if(method==="PATCH"){
  const site=request.headers.get("sec-fetch-site");
  if(site&&!["same-origin","none"].includes(site))
   return NextResponse.json({error:"Origem não permitida"},{status:403});
  try{body=JSON.stringify(await request.json());}
  catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>1200)return NextResponse.json({error:"Dados extensos"},{status:413});
 }
 const upstream=new URL(`${process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1"}/admin/customer-benefits/${resource}`);
 if(method==="GET"){
  const original=new URL(request.url);
  for(const key of ["cpf","excludeId","page"]){
   const value=original.searchParams.get(key);
   if(value&&value.length<=80)upstream.searchParams.set(key,value);
  }
 }
 try{
  const result=await fetch(upstream,{method,
   headers:{authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},
   body,cache:"no-store",signal:AbortSignal.timeout(12000)});
  return NextResponse.json(await result.json(),{status:result.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
