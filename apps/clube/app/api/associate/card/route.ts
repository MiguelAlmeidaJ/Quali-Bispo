import {NextRequest,NextResponse} from "next/server";

// Não expõe o JWT do associado no navegador. PDF sempre obtido sob demanda.
export async function GET(request:NextRequest){
 const token=request.cookies.get("quali_member_session")?.value;
 if(!token)return NextResponse.json({error:"Faça login para baixar seu cartão."},
  {status:401,headers:{"cache-control":"private, no-store"}});
 try{
  const base=process.env.INTERNAL_API_URL||"http://127.0.0.1:4002/v1";
  const response=await fetch(`${base}/member/card.pdf`,{
   headers:{authorization:`Bearer ${token}`},
   cache:"no-store",signal:AbortSignal.timeout(15000),
  });
  if(!response.ok){
   const body=await response.json().catch(()=>({}));
   return NextResponse.json({error:typeof body.message==="string"?body.message:"Não foi possível gerar o cartão."},
    {status:response.status,headers:{"cache-control":"private, no-store"}});
  }
  const pdf=await response.arrayBuffer();
  const disposition=response.headers.get("content-disposition")||'attachment; filename="cartao-quali.pdf"';
  return new NextResponse(pdf,{
   status:200,
   headers:{
    "content-type":"application/pdf",
    "content-disposition":disposition,
    "cache-control":"private, no-store, max-age=0",
    "x-content-type-options":"nosniff",
    "content-length":String(pdf.byteLength),
   },
  });
 }catch{
  return NextResponse.json({error:"Serviço de emissão temporariamente indisponível."},
   {status:503,headers:{"cache-control":"private, no-store"}});
 }
}
