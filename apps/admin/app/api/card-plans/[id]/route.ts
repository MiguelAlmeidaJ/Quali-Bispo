import {NextRequest,NextResponse} from "next/server";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:"ID inválido"},{status:400});
 const site=request.headers.get("sec-fetch-site");
 if(site&&!["same-origin","none"].includes(site))
  return NextResponse.json({error:"Origem não permitida"},{status:403});
 const token=request.cookies.get("quali_session")?.value;
 if(!token)return NextResponse.json({error:"Sem sessão"},{status:401});
 let body:string;
 try{body=JSON.stringify(await request.json());}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
 if(body.length>6000)return NextResponse.json({error:"Dados muito extensos"},{status:413});
 try{
  const base=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${base}/admin/card-plans/${id}`,{
   method:"PATCH",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
   body,cache:"no-store",signal:AbortSignal.timeout(12000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"API indisponível"},{status:503});}
}
