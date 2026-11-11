"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {FiDownload,FiPlus,FiSearch,FiX} from "react-icons/fi";
import type {User} from "../types/admin";

type Partner={id:string;name:string};
type Service={id:string;name:string;category:string;group:string;normalPriceCents:number;qualiPriceCents:number};
type Customer={id:string;name:string;status:string;cpfLast4:string|null;partner:{name:string}|null};
type Attendance={
 id:string;customerId:string;partnerId:string;catalogItemId:string;serviceName:string;serviceType:string;
 fullPriceCents:number;chargedCents:number;performedAt:string;
 customer:{name:string};partner:{name:string};registeredBy:{name:string;role:string};
};
type AttendanceResult={
 items:Attendance[];total:number;page:number;pageSize:number;
 summary:{fullPriceCents:number;chargedCents:number;savingsCents:number;consultations:number};
};
type Options={partners:Partner[];services:Service[];userPartnerId:string|null};
const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
const date=(value:string)=>new Date(value).toLocaleDateString("pt-BR",{timeZone:"UTC"});
const nowMonth=()=>new Date().toISOString().slice(0,7);
async function read<T>(url:string,init?:RequestInit):Promise<T>{
 const r=await fetch(url,{cache:"no-store",credentials:"same-origin",...init});
 const result=await r.json();
 if(!r.ok)throw new Error(Array.isArray(result.message)?result.message.join(", "):result.message||result.error||"Falha de conexão");
 return result as T;
}
function AttendanceModal({options,onClose,onSaved}:{
 options:Options;onClose:()=>void;onSaved:()=>Promise<void>;
}){
 const [query,setQuery]=useState("");
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [customerId,setCustomerId]=useState("");
 const [partnerId,setPartnerId]=useState(options.userPartnerId||options.partners[0]?.id||"");
 const [serviceId,setServiceId]=useState("");
 const [dateValue,setDateValue]=useState(new Date().toISOString().slice(0,10));
 const [error,setError]=useState(""),[busy,setBusy]=useState(false);
 const service=options.services.find(item=>item.id===serviceId);
 useEffect(()=>{
  if(query.trim().length<2){setCustomers([]);return;}
  const controller=new AbortController();
  const handle=setTimeout(()=>{
   read<Customer[]>(`/admin/api/attendances/customers?q=${encodeURIComponent(query)}`,{signal:controller.signal})
    .then(setCustomers).catch(err=>{if(!controller.signal.aborted)setError(err.message);});
  },250);
  return()=>{clearTimeout(handle);controller.abort();};
 },[query]);
 useEffect(()=>{
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  const key=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)onClose();};
  window.addEventListener("keydown",key);
  return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",key);};
 },[busy,onClose]);
 async function submit(event:React.FormEvent){
  event.preventDefault();setError("");
  const selected=customers.find(item=>item.id===customerId);
  if(!selected){setError("Selecione um cliente na pesquisa.");return;}
  if(selected.status!=="PAID"){setError("O cliente precisa estar com situação Pago para registrar um atendimento.");return;}
  setBusy(true);
  try{
   await read("/admin/api/attendances",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({customerId,partnerId,catalogItemId:serviceId,performedAt:dateValue})});
   await onSaved();onClose();
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível registrar");}
  finally{setBusy(false);}
 }
 return <div className="attendance-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
  <section role="dialog" aria-modal="true" aria-labelledby="attendance-modal-title" className="attendance-modal">
   <header><div><small>REDE QUALI</small><h2 id="attendance-modal-title">Novo atendimento</h2>
    <p>Registre o benefício utilizando os preços vigentes do catálogo.</p></div>
    <button aria-label="Fechar" type="button" disabled={busy} onClick={onClose}><FiX size={20}/></button></header>
   <form onSubmit={submit} className="attendance-form">
    <label><span className="attendance-label-title">Buscar associado <em>*</em></span>
     <div className="attendance-search-box"><FiSearch size={18}/><input value={query} placeholder="Digite pelo menos duas letras do nome"
      onChange={e=>{setQuery(e.target.value);setCustomerId("");setError("");}} autoComplete="off"/></div>
    </label>
    {query.length>=2&&<div className="attendance-customer-results">
     {customers.map(customer=><button key={customer.id} type="button" className={customerId===customer.id?"selected":""}
      onClick={()=>setCustomerId(customer.id)}>
       <span><b>{customer.name}</b><small>CPF final {customer.cpfLast4||"não disponível"} · {customer.partner?.name||"Sem unidade de cadastro"}</small></span>
       <strong className={customer.status==="PAID"?"allowed":"blocked"}>{customer.status==="PAID"?"Pago":"Revisar situação"}</strong>
      </button>)}
     {customers.length===0&&<p>Nenhum cliente encontrado.</p>}
    </div>}
    <div className="attendance-form-grid">
     <label><span className="attendance-label-title">Unidade credenciada <em>*</em></span><select required value={partnerId}
      disabled={!!options.userPartnerId} onChange={e=>setPartnerId(e.target.value)}>
      <option value="">Selecione</option>{options.partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
     </select></label>
     <label><span className="attendance-label-title">Data do atendimento <em>*</em></span><input required type="date" value={dateValue}
      max={new Date().toISOString().slice(0,10)} onChange={e=>setDateValue(e.target.value)}/></label>
     <label className="wide"><span className="attendance-label-title">Serviço / procedimento <em>*</em></span><select required value={serviceId} onChange={e=>setServiceId(e.target.value)}>
      <option value="">Selecione um procedimento do catálogo</option>{options.services.map(s=><option key={s.id} value={s.id}>{s.name} — {money(s.qualiPriceCents)}</option>)}
     </select></label>
    </div>
    {service&&<div className="attendance-prices"><span>Valor cheio: <del>{money(service.normalPriceCents)}</del></span>
     <span>Valor Quali: <strong>{money(service.qualiPriceCents)}</strong></span>
     <span>Economia: <strong>{money(service.normalPriceCents-service.qualiPriceCents)}</strong></span></div>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
     <button type="submit" className="attendance-save" disabled={busy||!customerId||!partnerId||!serviceId}>{busy?"Salvando...":"Registrar atendimento"}</button></footer>
   </form>
  </section>
 </div>;
}
function csvValue(value:string){const safe=/^[=+@-]/.test(value.trimStart())?"'"+value:value;return '"'+safe.replace(/"/g,'""')+'"';}
export function AttendancesPage({user}:{user:User}){
 const [options,setOptions]=useState<Options|null>(null);
 const [month,setMonth]=useState(nowMonth()),[partnerId,setPartnerId]=useState(""),[serviceType,setServiceType]=useState(""),[search,setSearch]=useState(""),[page,setPage]=useState(1);
 const [result,setResult]=useState<AttendanceResult|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[modal,setModal]=useState(false),[exporting,setExporting]=useState(false);
 const params=useMemo(()=>{
  const q=new URLSearchParams({month,page:String(page)});
  if(partnerId)q.set("partnerId",partnerId);
  if(serviceType)q.set("serviceType",serviceType);
  if(search.trim())q.set("search",search.trim());
  return q;
 },[month,page,partnerId,serviceType,search]);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{const next=await read<AttendanceResult>(`/admin/api/attendances?${params}`);setResult(next);setError("");}
  catch(err){setError(err instanceof Error?err.message:"Falha na consulta");}
  finally{setLoading(false);}
 },[params]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{void read<Options>("/admin/api/attendances/options").then(setOptions).catch(err=>setError(err.message));},[]);
 const pages=Math.max(1,Math.ceil((result?.total||0)/20));
 const records=result?.items||[],summary=result?.summary;
 const isPartner=user.role==="PARTNER";
 async function voidItem(item:Attendance){
  if(!window.confirm(`Cancelar o atendimento de ${item.customer.name}? O histórico será preservado.`))return;
  const reason=window.prompt("Informe o motivo do cancelamento (mínimo 5 caracteres):");
  if(!reason||reason.trim().length<5)return;
  try{await read(`/admin/api/attendances/${item.id}/void`,{
   method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({reason})});
   await refresh();
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível cancelar");}
 }
 async function exportCsv(){
  if(!result?.total)return;
  setExporting(true);
  try{
   const items:Attendance[]=[];
   const count=Math.ceil(result.total/20);
   if(count>200)throw new Error("A exportação está limitada a 4.000 registros por consulta. Refine os filtros.");
   for(let n=1;n<=count;n++){
    const q=new URLSearchParams(params);q.set("page",String(n));
    const batch=await read<AttendanceResult>(`/admin/api/attendances?${q}`);items.push(...batch.items);
   }
   const rows=[["Data","Beneficiário","Tipo","Parceiro","Serviço","Valor cheio","Cobrado","Economia","Registrado por"],
    ...items.map(item=>[date(item.performedAt),item.customer.name,item.serviceType,item.partner.name,item.serviceName,
     (item.fullPriceCents/100).toFixed(2),(item.chargedCents/100).toFixed(2),
     ((item.fullPriceCents-item.chargedCents)/100).toFixed(2),item.registeredBy.name])];
   const csv="\uFEFF"+rows.map(row=>row.map(csvValue).join(";")).join("\r\n");
   const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download=`atendimentos-${month}.csv`;a.click();
   URL.revokeObjectURL(url);
  }catch(err){setError(err instanceof Error?err.message:"Erro ao exportar");}
  finally{setExporting(false);}
 }
 return <div className="attendance-page">
  <div className="attendance-heading"><div><h1>Atendimentos</h1><p>Uso dos benefícios na rede credenciada</p></div>
   <div className="attendance-heading-actions">
    <button className="attendance-export" type="button" disabled={exporting||!result?.total} onClick={()=>void exportCsv()}><FiDownload/> {exporting?"Exportando...":"Exportar CSV"}</button>
    <button className="attendance-new" type="button" disabled={!options?.partners.length||!options.services.length} onClick={()=>setModal(true)}><FiPlus/> Novo atendimento</button>
   </div>
  </div>
  <div className="attendance-filters">
   <label>Mês<input type="month" value={month} onChange={e=>{setMonth(e.target.value);setPage(1);}}/></label>
   <label>Tipo<select value={serviceType} onChange={e=>{setServiceType(e.target.value);setPage(1);}}>
    <option value="">Todos</option>{["CONSULTA","CHECKUP","EXAME","PROCEDIMENTO","TERAPIA"].map(type=><option key={type} value={type}>{type}</option>)}
   </select></label>
   <label>Parceiro<select value={partnerId} disabled={isPartner} onChange={e=>{setPartnerId(e.target.value);setPage(1);}}>
    <option value="">{isPartner?"Minha unidade":"Todos"}</option>{options?.partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select></label>
   <label>Buscar associado<input placeholder="Nome" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>
  </div>
  {error&&<p className="notice error" role="alert">{error}</p>}
  <section className="attendance-table-card">
   {loading?<p className="attendance-empty">Carregando atendimentos...</p>:records.length===0?<p className="attendance-empty">Nenhum atendimento encontrado neste período.</p>:
    <div className="attendance-table-scroll"><table className="attendance-table">
     <thead><tr><th>DATA</th><th>BENEFICIÁRIO</th><th>TIPO</th><th>PARCEIRO</th><th>SERVIÇO</th><th>VALOR CHEIO</th><th>COBRADO</th><th>ECONOMIA</th><th>REGISTRADO POR</th>{!isPartner&&<th>AÇÕES</th>}</tr></thead>
     <tbody>{records.map(item=><tr key={item.id}>
      <td>{date(item.performedAt)}</td><td><strong>{item.customer.name}</strong></td><td>{item.serviceType}</td><td>{item.partner.name}</td><td>{item.serviceName}</td>
      <td>{money(item.fullPriceCents)}</td><td>{money(item.chargedCents)}</td><td className="attendance-green">{money(item.fullPriceCents-item.chargedCents)}</td>
      <td>{item.registeredBy.name}</td>{!isPartner&&<td><button type="button" className="attendance-void" onClick={()=>void voidItem(item)}>Cancelar</button></td>}
     </tr>)}</tbody>
    </table></div>}
   <footer className="attendance-table-footer"><span>{result?.total||0} atendimento(s)</span>
    <nav><button type="button" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button>
     Página {page} de {pages}
     <button type="button" disabled={page>=pages||loading} onClick={()=>setPage(p=>p+1)}>Próxima</button></nav></footer>
  </section>
  <div className="attendance-summary"><b>{result?.total||0}</b> atendimento(s)
   <span>Valor cheio <b>{money(summary?.fullPriceCents||0)}</b></span>
   <span>Cobrado <b>{money(summary?.chargedCents||0)}</b></span>
   <span>Economia aos associados <b className="attendance-green">{money(summary?.savingsCents||0)}</b></span>
   <span>Consultas (contam no limite) <b>{summary?.consultations||0}</b></span>
  </div>
  {modal&&options&&<AttendanceModal options={options} onClose={()=>setModal(false)} onSaved={refresh}/>}
 </div>;
}
