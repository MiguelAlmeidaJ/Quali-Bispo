import type {CatalogInput,CatalogItem} from "../types/catalog";
async function send<T>(url:string,method="GET",data?:CatalogInput):Promise<T>{
 const response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",
  headers:data?{"content-type":"application/json"}:undefined,
  body:data?JSON.stringify(data):undefined});
 const json=await response.json();
 if(!response.ok)throw new Error(Array.isArray(json.message)?json.message.join(", "):json.message||json.error||"Falha ao carregar");
 return json as T;
}
export const catalogApi={
 list:()=>send<CatalogItem[]>("/admin/api/catalog"),
 create:(input:CatalogInput)=>send<CatalogItem>("/admin/api/catalog","POST",input),
 update:(id:string,input:CatalogInput)=>send<CatalogItem>(`/admin/api/catalog/${id}`,"PATCH",input),
};
