import {NextRequest,NextResponse} from "next/server";
const cookieName="quali_member_session";
const api=()=>process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
const memberCookie={httpOnly:true,secure:process.env.NODE_ENV==="production"&&process.env.COOKIE_SECURE==="true",
 sameSite:"lax" as const,path:"/",maxAge:7200};
export async function POST(request:NextRequest){
 const site=request.headers.get("sec-fetch-site");
 if(site&&!["same-origin","none"].includes(site))
  return NextResponse.json({error:"Origem não permitida"},{status:403});
 let body:{cpf?:unknown;birthDate?:unknown};
 try{body=await request.json();}catch{return NextResponse.json({error:"Dados inválidos"},{status:400});}
 if(typeof body.cpf!=="string"||typeof body.birthDate!=="string"||body.cpf.length>25||body.birthDate.length>25)
  return NextResponse.json({error:"Informe CPF e data de nascimento"},{status:400});
 try{
  const response=await fetch(`${api()}/member/login`,{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(10000),
  });
  if(!response.ok){
   const data=await response.json().catch(()=>({}));
   return NextResponse.json({error:typeof data.message==="string"?data.message:"Não foi possível confirmar seus dados."},
    {status:response.status,headers:{"cache-control":"no-store"}});
  }
  const data=await response.json() as {token:string};
  const result=NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
  result.cookies.set(cookieName,data.token,memberCookie);
  return result;
 }catch{return NextResponse.json({error:"Serviço temporariamente indisponível"},{status:503});}
}
export async function GET(request:NextRequest){
 const token=request.cookies.get(cookieName)?.value;
 if(!token)return NextResponse.json({authenticated:false},{status:401,headers:{"cache-control":"no-store"}});
 try{
  const response=await fetch(`${api()}/member/me`,{
   headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)return NextResponse.json({authenticated:false},{status:401,headers:{"cache-control":"no-store"}});
  return NextResponse.json({authenticated:true,member:await response.json()},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Serviço indisponível"},{status:503});}
}
export async function DELETE(request:NextRequest){
 const site=request.headers.get("sec-fetch-site");
 if(site&&!["same-origin","none"].includes(site))
  return NextResponse.json({error:"Origem não permitida"},{status:403});
 const response=NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
 response.cookies.set(cookieName,"",{...memberCookie,maxAge:0});
 return response;
}
