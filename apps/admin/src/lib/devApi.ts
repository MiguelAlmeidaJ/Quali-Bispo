export async function devApi<T>(endpoint: "administrators"|"audit"|"settings", method:"GET"|"POST"|"PUT"="GET", body?:unknown):Promise<T>{
 const response=await fetch(`/admin/api/dev/${endpoint}`,{
  method,credentials:"same-origin",cache:"no-store",
  headers:body===undefined?undefined:{"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const data:unknown=await response.json();
 if(!response.ok){
  const error=data as {message?:string|string[];error?:string};
  throw new Error(Array.isArray(error.message)?error.message.join(", "):error.message||error.error||"Não foi possível concluir a operação.");
 }
 return data as T;
}
