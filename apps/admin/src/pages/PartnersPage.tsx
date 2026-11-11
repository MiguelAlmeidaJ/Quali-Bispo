"use client";
import {useEffect,useMemo,useState} from "react";
import {FiCheck,FiEdit2,FiMapPin,FiPlus,FiRefreshCw,FiSearch,FiX} from "react-icons/fi";
import type {Partner,PartnerInput} from "../types/partner";
import {newPartner,serviceTypes} from "../types/partner";
import {partnersApi} from "../lib/partnersApi";

function PartnerModal({partner,onClose,onSaved}:{
 partner:Partner|null;onClose:()=>void;onSaved:()=>Promise<void>;
}){
 const[form,setForm]=useState<PartnerInput>(partner?{
  name:partner.name,serviceType:partner.serviceType,services:partner.services,
  address:partner.address,city:partner.city,phone:partner.phone,
  businessHours:partner.businessHours,discountPercent:partner.discountPercent,active:partner.active,
 }:{...newPartner});
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)onClose()};
  window.addEventListener("keydown",onKey);
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  return()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=previous};
 },[onClose,busy]);
 function update<K extends keyof PartnerInput>(key:K,value:PartnerInput[K]){
  setForm(current=>({...current,[key]:value}));
 }
 async function save(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");
  try {
   if(partner)await partnersApi.update(partner.id,form);
   else await partnersApi.create(form);
   await onSaved();onClose();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar");}
  finally{setBusy(false)}
 }
 return <div className="partner-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <div className="partner-modal" role="dialog" aria-modal="true" aria-labelledby="partner-modal-title">
   <div className="partner-modal-header">
    <div><span className="partner-eyebrow">REDE CREDENCIADA</span>
     <h2 id="partner-modal-title">{partner?"Editar parceiro":"Novo parceiro"}</h2>
     <p>{partner?"Atualize os dados e a disponibilidade da unidade.":"Preencha os dados para cadastrar uma nova unidade."}</p>
    </div>
    <button className="partner-icon-btn" type="button" aria-label="Fechar formulário" disabled={busy} onClick={onClose}><FiX size={21}/></button>
   </div>
   <form onSubmit={save} className="partner-modal-form">
    <div className="partner-form-grid">
     <label className="partner-field full">Nome do parceiro <span className="required">*</span>
      <input required maxLength={120} autoFocus value={form.name} placeholder="Ex.: Unidade Centro"
       onChange={e=>update("name",e.target.value)}/>
     </label>
     <label className="partner-field">Tipo de atendimento <span className="required">*</span>
      <select required value={form.serviceType} onChange={e=>update("serviceType",e.target.value)}>
       {serviceTypes.map(item=><option key={item} value={item}>{item}</option>)}
      </select>
     </label>
     <label className="partner-field">Desconto (%) <span className="required">*</span>
      <input type="number" min={0} max={100} step={1} required value={form.discountPercent}
       onChange={e=>update("discountPercent",Number(e.target.value))}/>
     </label>
     <label className="partner-field full">Especialidades e serviços
      <textarea rows={2} maxLength={600} value={form.services} placeholder="Ex.: Cardiologia, Pediatria, exames laboratoriais"
       onChange={e=>update("services",e.target.value)}/>
     </label>
     <label className="partner-field full">Endereço <span className="required">*</span>
      <input required maxLength={250} value={form.address} placeholder="Rua, número, bairro"
       onChange={e=>update("address",e.target.value)}/>
     </label>
     <label className="partner-field">Cidade / UF <span className="required">*</span>
      <input required maxLength={100} value={form.city} placeholder="Ex.: Niterói/RJ"
       onChange={e=>update("city",e.target.value)}/>
     </label>
     <label className="partner-field">Telefone de contato
      <input maxLength={30} value={form.phone||""} type="tel" placeholder="(21) 99999-9999"
       onChange={e=>update("phone",e.target.value)}/>
     </label>
     <label className="partner-field full">Horário de funcionamento
      <input maxLength={250} value={form.businessHours}
       placeholder="Seg a sex: 8h às 17h · Sáb: 8h às 12h"
       onChange={e=>update("businessHours",e.target.value)}/>
     </label>
     <label className="partner-status-field full">
      <input type="checkbox" checked={form.active} onChange={e=>update("active",e.target.checked)}/>
      <span><b>Parceiro ativo</b><small>Unidades inativas não aparecem no Clube Quali.</small></span>
     </label>
    </div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    <div className="partner-modal-actions">
     <button type="button" className="partner-secondary-btn" disabled={busy} onClick={onClose}>Cancelar</button>
     <button type="submit" className="partner-primary-btn" disabled={busy}><FiCheck size={17}/>{busy?"Salvando...":partner?"Salvar alterações":"Cadastrar parceiro"}</button>
    </div>
   </form>
  </div>
 </div>;
}

export function PartnersPage(){
 const[items,setItems]=useState<Partner[]>([]);
 const[loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[status,setStatus]=useState("all");
 const[modal,setModal]=useState<{open:boolean;partner:Partner|null}>({open:false,partner:null});
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
  return !term||[p.name,p.city,p.services,p.serviceType,p.address].some(value=>value.toLocaleLowerCase("pt-BR").includes(term));
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
     <td>{p.serviceType}<span className="partner-subtext">{p.services}</span></td>
     <td>{p.city}</td><td className="partner-hours">{p.businessHours||"—"}</td>
     <td>{p.phone||"—"}</td>
     <td><span className="partner-discount-badge">até {p.discountPercent}%</span></td>
     <td>{p.monthlyAttendances}</td>
     <td><span className={`partner-status ${p.active?"is-active":"is-inactive"}`}>{p.active?"Ativo":"Inativo"}</span></td>
     <td><button type="button" className="partner-edit-btn" onClick={()=>setModal({open:true,partner:p})}><FiEdit2 size={14}/>Editar</button></td>
    </tr>)}</tbody>
   </table></div>}
   <div className="partners-table-footer">Exibindo {filtered.length} de {items.length} parceiros</div>
  </section>
  {modal.open&&<PartnerModal partner={modal.partner} onClose={()=>setModal({open:false,partner:null})} onSaved={refresh}/>}
 </div>;
}
