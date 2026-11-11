import { NextRequest,NextResponse } from "next/server";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[0-9a-fA-F-]{36}$/.test(id))return NextResponse.json({error:"Identificador inválido"},{status:400});
  if(request.headers.has("sec-fetch-site") &&
    !["same-origin","none"].includes(request.headers.get("sec-fetch-site")!)){
    return NextResponse.json({error:"Origem não permitida"},{status:403});
  }
  const token=request.cookies.get("quali_session")?.value;
  if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
  let body:string;
  try{body=JSON.stringify(await request.json());}
  catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  if(body.length>8000)return NextResponse.json({error:"Dados muito extensos"},{status:413});
  try{
    const endpoint=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
    const response=await fetch(`${endpoint}/admin/partners/${id}`,{
      method:"PATCH",headers:{Authorization:`Bearer ${token}`,"content-type":"application/json"},
      body,cache:"no-store",signal:AbortSignal.timeout(10000),
    });
    return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
  }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
