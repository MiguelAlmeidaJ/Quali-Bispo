"use client";
import {useEffect,useMemo,useState} from "react";
import {FiEdit2,FiKey,FiMapPin,FiPlus,FiRefreshCw,FiSearch} from "react-icons/fi";
import {PartnerModal} from "../components/PartnerModal";
import {PartnerAccessModal} from "../components/PartnerAccessModal";
import type {Partner} from "../types/partner";
import {partnersApi} from "../lib/partnersApi";

export function PartnersPage(){
 const[items,setItems]=useState<Partner[]>([]);
 const[loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[status,setStatus]=useState("all");
 const[modal,setModal]=useState<{open:boolean;partner:Partner|null}>({open:false,partner:null});
 const[accessPartner,setAccessPartner]=useState<Partner|null>(null);
 async function refresh(){
  try{const list=await partnersApi.list();setItems(list);setError("");}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar");}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[]);
 const filtered=useMemo(()=>items.filter(p=>{
  if(status==="active"&&!p.active)return false;
  if(status==="inactive"&&p.active)return false;
  const term=search.trim().toLocaleLowerCase("pt-BR");
  return !term||[p.name,p.city,p.services,p.serviceType,...(p.serviceTypes||[]),p.address].some(value=>value.toLocaleLowerCase("pt-BR").includes(term));
 }),[items,search,status]);
 const active=items.filter(p=>p.active).length;
 const appointments=items.reduce((total,p)=>total+p.monthlyAttendances,0);
 return <div className="partners-admin-page">
  <div className="partners-title">
   <div><span className="partner-eyebrow">GESTÃO DA REDE</span><h1>Rede credenciada</h1>
    <p>Gerencie as unidades exibidas no Clube, na validação e na carteirinha.</p></div>
   <button type="button" className="partner-primary-btn" onClick={()=>setModal({open:true,partner:null})}><FiPlus size={18}/>Novo parceiro</button>
  </div>
  <div className="partners-overview">
   <div className="partner-kpi"><span>Unidades cadastradas</span><strong>{items.length}</strong></div>
   <div className="partner-kpi"><span>Parceiros ativos</span><strong className="green">{active}</strong></div>
   <div className="partner-kpi"><span>Atendimentos no mês</span><strong>{appointments}</strong></div>
  </div>
  <section className="partners-table-card">
   <div className="partners-table-toolbar">
    <div className="partners-search"><FiSearch size={18}/><input aria-label="Buscar parceiros" placeholder="Buscar unidade, cidade ou especialidade" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <select aria-label="Filtrar situação" value={status} onChange={e=>setStatus(e.target.value)}>
     <option value="all">Todas as situações</option><option value="active">Ativos</option><option value="inactive">Inativos</option>
    </select>
    <button type="button" className="partner-icon-btn" aria-label="Atualizar lista" title="Atualizar lista" onClick={()=>{setLoading(true);void refresh()}}><FiRefreshCw size={18}/></button>
   </div>
   {error&&<div className="notice error" role="alert">{error}</div>}
   {loading?<div className="partners-empty">Carregando rede credenciada...</div>:
   filtered.length===0?<div className="partners-empty">{items.length?"Nenhum parceiro corresponde aos filtros.":"Nenhum parceiro cadastrado ainda. Use “Novo parceiro” para começar."}</div>:
   <div className="partners-scroll"><table className="partners-table">
    <thead><tr><th>UNIDADE</th><th>ATENDIMENTO</th><th>CIDADE</th><th>HORÁRIO</th><th>TELEFONE</th><th>DESCONTO</th><th>ATEND. (MÊS)</th><th>SITUAÇÃO</th><th><span className="sr-only">Ações</span></th></tr></thead>
    <tbody>{filtered.map(p=><tr key={p.id}>
     <td><b>{p.name}</b><span className="partner-address"><FiMapPin size={13}/>{p.address}</span></td>
     <td><div className="partner-service-badges">{(p.serviceTypes?.length?p.serviceTypes:[p.serviceType]).map(type=><span className="partner-service-badge" key={type}>{type}</span>)}</div><span className="partner-subtext">{p.services}</span></td>
     <td>{p.city}</td><td className="partner-hours">{p.businessHours||"—"}</td>
     <td>{p.phone||"—"}</td>
     <td><span className="partner-discount-badge">até {p.discountPercent}%</span></td>
     <td>{p.monthlyAttendances}</td>
     <td><span className={`partner-status ${p.active?"is-active":"is-inactive"}`}>{p.active?"Ativo":"Inativo"}</span></td>
     <td><div className="partner-row-actions"><button type="button" className="partner-edit-btn" onClick={()=>setAccessPartner(p)}><FiKey size={14}/>Acesso</button><button type="button" className="partner-edit-btn" onClick={()=>setModal({open:true,partner:p})}><FiEdit2 size={14}/>Editar</button></div></td>
    </tr>)}</tbody>
   </table></div>}
   <div className="partners-table-footer">Exibindo {filtered.length} de {items.length} parceiros</div>
  </section>
  {accessPartner&&<PartnerAccessModal partner={accessPartner} onClose={()=>setAccessPartner(null)}/>}
  {modal.open&&<PartnerModal partner={modal.partner} onClose={()=>setModal({open:false,partner:null})} onSaved={refresh}/>}
 </div>;
}
