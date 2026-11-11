"use client";
import {useEffect,useState} from "react";
type Entry={id:string;actorId:string|null;action:string;entityType:string;entityId:string|null;createdAt:string;metadata:unknown};
type Result={items:Entry[];total:number;page:number;pageSize:number};
export function AuditPage(){
 const[page,setPage]=useState(1),[data,setData]=useState<Result|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;setLoading(true);
  fetch(`/admin/api/dev/audit?page=${page}`,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||d.error||"Erro ao consultar");if(active)setData(d)})
  .catch(e=>{if(active)setError((e as Error).message)}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[page]);
 return <div className="dev-page"><header className="page-title"><div><h1>Auditoria do sistema</h1><p>Histórico de ações registradas no banco · acesso exclusivo DEV</p></div></header>
 <section className="panel"><div className="dev-row"><h2>Eventos recentes</h2><span className="muted">{data?.total??0} registros</span></div>
 {error&&<p role="alert" className="notice error">{error}</p>}
 {loading?<p>Carregando...</p>:data?.items.length===0?<p className="muted">Nenhum evento registrado.</p>:
 <div className="dev-table-scroll"><table className="dev-table"><thead><tr><th>Data e hora</th><th>Ação</th><th>Entidade</th><th>Ator</th><th>Detalhes</th></tr></thead>
 <tbody>{data?.items.map(item=><tr key={item.id}><td>{new Date(item.createdAt).toLocaleString("pt-BR")}</td><td><b>{item.action}</b></td><td>{item.entityType}</td><td className="audit-id">{item.actorId?.slice(0,8)||"Sistema"}</td><td><details><summary>Ver metadados</summary><pre>{JSON.stringify(item.metadata,null,2)}</pre></details></td></tr>)}</tbody></table></div>}
 <div className="dev-actions"><button type="button" onClick={()=>setPage(v=>Math.max(1,v-1))} disabled={page===1}>Anterior</button><span>Página {page}</span><button type="button" onClick={()=>setPage(v=>v+1)} disabled={!data||page*data.pageSize>=data.total}>Próxima</button></div>
 </section></div>;
}
