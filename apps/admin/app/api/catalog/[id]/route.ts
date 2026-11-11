import {NextRequest,NextResponse} from "next/server";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"ID inválido"},{status:400});
 if(request.headers.has("sec-fetch-site")&&!["same-origin","none"].includes(request.headers.get("sec-fetch-site")!))
  return NextResponse.json({error:"Origem inválida"},{status:403});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sessão necessária"},{status:401});
 let body:string;
 try{body=JSON.stringify(await request.json());}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
 if(body.length>7000)return NextResponse.json({error:"Dados extensos"},{status:413});
 try{
  const api=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const r=await fetch(`${api}/admin/catalog/${id}`,{method:"PATCH",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body,cache:"no-store",signal:AbortSignal.timeout(10000)});
  return NextResponse.json(await r.json(),{status:r.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
