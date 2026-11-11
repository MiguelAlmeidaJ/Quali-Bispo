import {NextRequest,NextResponse} from "next/server";
const allowed = {
 administrators: new Set(["GET","POST"]),
 audit: new Set(["GET"]),
 settings: new Set(["GET","PUT"])
} as const;

type Resource = keyof typeof allowed;
async function handle(request:NextRequest, resource:string, method:"GET"|"POST"|"PUT"){
 if(!(resource in allowed) || !(allowed[resource as Resource] as ReadonlySet<string>).has(method))
   return NextResponse.json({error:"Recurso não encontrado"},{status:404});
 if(method!=="GET" && request.headers.has("sec-fetch-site") && !["same-origin","none"].includes(request.headers.get("sec-fetch-site")!)) {
   return NextResponse.json({error:"Origem não permitida"},{status:403});
 }
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
 let body:string|undefined;
 if(method!=="GET"){
  try{
   const payload=await request.json();
   body=JSON.stringify(payload);
  }catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>12000)return NextResponse.json({error:"Requisição muito grande"},{status:413});
 }
 const api=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
 const url=new URL(`${api}/dev/${resource}`);
 if(resource==="audit"){
  const page=request.nextUrl.searchParams.get("page");
  const action=request.nextUrl.searchParams.get("action");
  if(page)url.searchParams.set("page",page.slice(0,5));
  if(action)url.searchParams.set("action",action.slice(0,60));
 }
 try{
  const response=await fetch(url,{method,headers:{"authorization":`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},body,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await response.json();
  return NextResponse.json(data,{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
export async function GET(req:NextRequest,context:{params:Promise<{resource:string}>}){
 return handle(req,(await context.params).resource,"GET");
}
export async function POST(req:NextRequest,context:{params:Promise<{resource:string}>}){
 return handle(req,(await context.params).resource,"POST");
}
export async function PUT(req:NextRequest,context:{params:Promise<{resource:string}>}){
 return handle(req,(await context.params).resource,"PUT");
}
