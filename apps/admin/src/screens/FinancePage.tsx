"use client";
import {useCallback,useEffect,useState} from "react";
import {FiAlertTriangle,FiCheckCircle,FiSearch,FiPlus,FiEdit2} from "react-icons/fi";

type Status="PAID"|"OPEN"|"EXPECTED"|"PENDING"|"IN_REVIEW"|"AWAITING"|"UNSPECIFIED";
type BaseRow={
 id:string;name:string;planType:string|null;amountCents:number|null;paymentMethod:string|null;
 paymentDetails:string|null;referenceDate:string|null;rawStatus:string|null;status:Status;
};
type Customer=BaseRow&{cpfLast4:string|null;cpfValid:boolean;cpfConflict:boolean;unit:string|null;invoice:string|null};
type Issue=BaseRow&{customerId:string|null;resolved:boolean};
type PageResult<T>={items:T[];total:number;page:number;pageSize:number};
type Summary={customers:number;paid:number;open:number;issues:number;unresolved:number;unmatched:number;invalidCpf:number};
const statusLabels:Record<Status,string>={
 PAID:"Pago",OPEN:"Em aberto",EXPECTED:"Previsto",PENDING:"Pendente",
 IN_REVIEW:"Tratativa",AWAITING:"Aguardando",UNSPECIFIED:"Sem informação",
};
const statusOptions=Object.entries(statusLabels) as [Status,string][];
const money=(value:number|null)=>value===null?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);

async function request<T>(url:string,init?:RequestInit):Promise<T>{
 const res=await fetch(url,{cache:"no-store",credentials:"same-origin",...init});
 const data=await res.json();
 if(!res.ok)throw new Error(typeof data.message==="string"?data.message:data.error||"Erro ao consultar o financeiro");
 return data as T;
}

export function FinancePage({type}:{type:"customers"|"issues"}){
 const [items,setItems]=useState<(Customer|Issue)[]>([]);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [search,setSearch]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(1);
 const [unresolved,setUnresolved]=useState(true);
 const [total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [savingId,setSavingId]=useState<string|null>(null);
 const title=type==="customers"?"Clientes":"Inadimplência e pendências";
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{
   const query=new URLSearchParams({page:String(page)});
   if(search.trim())query.set("search",search.trim());
   if(status)query.set("status",status);
   if(type==="issues"&&unresolved)query.set("unresolved","true");
   const [result,stats]=await Promise.all([
    request<PageResult<Customer|Issue>>(`/admin/api/finance/${type}?${query}`),
    request<Summary>("/admin/api/finance/summary"),
   ]);
   setItems(result.items);setTotal(result.total);setSummary(stats);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Falha na consulta");}
  finally{setLoading(false);}
 },[type,page,search,status,unresolved]);
 useEffect(()=>{void refresh();},[refresh]);
 async function save(row:Customer|Issue,change:Partial<{status:Status;resolved:boolean}>){
  const next={status:change.status||row.status,...(type==="issues"?{resolved:change.resolved??(row as Issue).resolved}:{})};
  setSavingId(row.id);setError("");
  try{
   await request(`/admin/api/finance/${type}/${row.id}`,{
    method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(next),
   });
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Falha na atualização");}
  finally{setSavingId(null);}
 }
 const pages=Math.max(1,Math.ceil(total/20));
 return <div className="finance-page">
  <header className="page-title finance-page-title"><div><h1>{title}</h1><p>{type==="customers"?"Cadastro financeiro importado da planilha Quali.":"Pendências e cobranças para acompanhamento."}</p></div>{type==="customers"&&<a className="customer-new-link" href="/admin/cliente/novo"><FiPlus size={18}/> Novo cliente</a>}</header>
  <div className="finance-stats">
   <article><span>Clientes importados</span><strong>{summary?.customers??"—"}</strong></article>
   <article><span>Pagamentos em dia</span><strong className="finance-ok">{summary?.paid??"—"}</strong></article>
   <article><span>Pendências não resolvidas</span><strong className="finance-alert">{summary?.unresolved??"—"}</strong></article>
   <article><span>Sem vínculo confirmado</span><strong>{summary?.unmatched??"—"}</strong></article>
  </div>
  {summary&&summary.invalidCpf>0&&<div className="finance-info"><FiAlertTriangle size={18}/>
   {summary.invalidCpf} registros precisam de revisão de CPF (ausente, inválido ou repetido). Nenhuma associação automática foi feita para esses casos.
  </div>}
  <section className="finance-table-card">
   <div className="finance-toolbar">
    <label className="finance-search"><FiSearch size={18}/><input aria-label="Buscar cliente" placeholder="Pesquisar pelo nome..." value={search}
     onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>
    <select aria-label="Filtrar situação" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
     <option value="">Todas as situações</option>{statusOptions.map(([key,label])=><option value={key} key={key}>{label}</option>)}
    </select>
    {type==="issues"&&<label className="finance-only-open"><input type="checkbox" checked={unresolved} onChange={e=>{setUnresolved(e.target.checked);setPage(1);}}/> Somente não resolvidas</label>}
   </div>
   {error&&<p role="alert" className="notice error">{error}</p>}
   {loading?<p className="finance-empty">Carregando registros...</p>:items.length===0?<p className="finance-empty">Nenhum registro encontrado.</p>:
   <div className="finance-scroll"><table className="finance-table"><thead><tr><th>NOME</th>
    {type==="customers"?<th>CPF</th>:<th>VÍNCULO</th>}
    <th>PLANO</th><th>VALOR</th><th>PAGAMENTO</th><th>OBSERVAÇÕES</th><th>SITUAÇÃO</th>{type==="customers"&&<th>AÇÕES</th>}{type==="issues"&&<th>RESOLUÇÃO</th>}</tr></thead>
    <tbody>{items.map(row=><tr key={row.id}>
     <td><b>{row.name}</b>{type==="customers"&&(row as Customer).unit&&<small>{(row as Customer).unit}</small>}</td>
     <td>{type==="customers"?(row as Customer).cpfValid&&!(row as Customer).cpfConflict?`***.***.***-${(row as Customer).cpfLast4?.slice(-2)||"**"}`:"Revisar CPF":
      (row as Issue).customerId?<span className="finance-linked"><FiCheckCircle/> Vinculado</span>:<span className="finance-unmatched">Não identificado</span>}</td>
     <td>{row.planType||"—"}</td><td>{money(row.amountCents)}</td><td>{row.paymentMethod||"—"}</td>
     <td className="finance-notes">{row.paymentDetails||"—"}{row.referenceDate&&<small>{new Date(row.referenceDate).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</small>}</td>
     <td><select className="finance-status-select" aria-label={`Situação de ${row.name}`} value={row.status} disabled={savingId===row.id}
      onChange={e=>void save(row,{status:e.target.value as Status})}>{statusOptions.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></td>
     {type==="customers"&&<td><a className="customer-edit-link" href={`/admin/cliente/${row.id}/edit`}><FiEdit2 size={15}/> Editar</a></td>}
     {type==="issues"&&<td><label className="finance-resolve"><input type="checkbox" checked={(row as Issue).resolved} disabled={savingId===row.id}
      onChange={e=>void save(row,{resolved:e.target.checked})}/> Resolvida</label></td>}
    </tr>)}</tbody></table></div>}
   <footer className="finance-footer"><span>{total? `Exibindo ${(page-1)*20+1}–${Math.min(page*20,total)} de ${total}`:"Nenhum registro"} · 20 por página</span>
    <nav aria-label="Páginas"><button disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button>
     <span>Página {page} de {pages}</span><button disabled={page>=pages||loading} onClick={()=>setPage(p=>p+1)}>Próxima</button></nav></footer>
  </section>
 </div>;
}
