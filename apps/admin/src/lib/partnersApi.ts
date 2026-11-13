import type {Partner,PartnerInput} from "../types/partner";
async function send<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{cache:"no-store",credentials:"same-origin",...init});
  const body=await response.json();
  if(!response.ok){
    const detail=Array.isArray(body.message)?body.message.join(", "):body.message||body.error||"Não foi possível concluir a solicitação";
    throw new Error(detail);
  }
  return body as T;
}
export const partnersApi={
 list:()=>send<Partner[]>("/admin/api/partners"),
 create:(data:PartnerInput)=>send<Partner>("/admin/api/partners",{
  method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data),
 }),
 update:(id:string,data:PartnerInput)=>send<Partner>(`/admin/api/partners/${id}`,{
  method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data),
 }),
};
