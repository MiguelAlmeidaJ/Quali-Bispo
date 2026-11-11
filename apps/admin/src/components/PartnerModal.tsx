"use client";
import {useEffect,useId,useRef,useState} from "react";
import {FiCheck,FiChevronDown,FiSearch,FiX} from "react-icons/fi";
import type {Partner,PartnerInput} from "../types/partner";
import {newPartner,serviceTypes} from "../types/partner";
import {partnersApi} from "../lib/partnersApi";

function AttendanceMultiSelect({value,onChange,disabled}:{
 value:string[];onChange:(value:string[])=>void;disabled:boolean;
}){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const wrapper=useRef<HTMLDivElement>(null);
 const id=useId();
 useEffect(()=>{
  function outside(event:PointerEvent){
   if(wrapper.current&&!wrapper.current.contains(event.target as Node))setOpen(false);
  }
  document.addEventListener("pointerdown",outside);
  return()=>document.removeEventListener("pointerdown",outside);
 },[]);
 function toggle(type:string){
  onChange(value.includes(type)?value.filter(v=>v!==type):[...value,type]);
 }
 const visible=serviceTypes.filter(type=>type.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
 return <div className="partner-multiselect" ref={wrapper}>
  <button type="button" className={`partner-multiselect-trigger ${open?"is-open":""}`}
   aria-expanded={open} aria-controls={id} disabled={disabled}
   aria-label="Selecionar tipos de atendimento" onClick={()=>setOpen(!open)}>
   <span className="partner-select-value">{value.length?(`${value.length} ${value.length===1?"tipo selecionado":"tipos selecionados"}`):"Selecionar atendimentos"}</span>
   <FiChevronDown size={18} aria-hidden="true"/>
  </button>
  {value.length>0&&<div className="partner-selected-tags">{value.map(type=><span key={type} className="partner-selected-tag">
    {type}<button aria-label={`Remover ${type}`} type="button" disabled={disabled}
     onClick={()=>toggle(type)}><FiX size={13}/></button>
   </span>)}</div>}
  {open&&<div className="partner-multiselect-menu" id={id}>
   <div className="partner-select-search"><FiSearch size={15}/><input aria-label="Pesquisar tipo de atendimento" autoFocus
    value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar atendimento..."/></div>
   <div className="partner-multiselect-options">
    {visible.length?visible.map(type=><label className="partner-multiselect-option" key={type}>
      <input type="checkbox" checked={value.includes(type)} onChange={()=>toggle(type)}/>
      <span>{type}</span>{value.includes(type)&&<FiCheck size={16} aria-hidden="true"/>}
    </label>):<p className="partner-select-empty">Nenhum tipo encontrado.</p>}
   </div>
   <div className="partner-select-actions">
    <span>{value.length} selecionado(s)</span><button type="button" onClick={()=>setOpen(false)}>Concluir</button>
   </div>
  </div>}
 </div>;
}

export function PartnerModal({partner,onClose,onSaved}:{
 partner:Partner|null;onClose:()=>void;onSaved:()=>Promise<void>;
}){
 const initialTypes=partner?.serviceTypes?.length?partner.serviceTypes:
  partner?.serviceType?[partner.serviceType]:newPartner.serviceTypes;
 const [form,setForm]=useState<PartnerInput>(partner?{
  name:partner.name,serviceType:initialTypes[0],serviceTypes:initialTypes,services:partner.services,
  address:partner.address,city:partner.city,phone:partner.phone,
  businessHours:partner.businessHours,discountPercent:partner.discountPercent,active:partner.active,
 }:{...newPartner,serviceTypes:[...newPartner.serviceTypes]});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const titleRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  titleRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)onClose();};
  window.addEventListener("keydown",onKey);
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  return()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=previous;};
 },[onClose,busy]);
 function update<K extends keyof PartnerInput>(key:K,value:PartnerInput[K]){
  setForm(current=>({...current,[key]:value}));
 }
 function updateTypes(types:string[]){
  setForm(current=>({...current,serviceTypes:types,serviceType:types[0]||""}));
  setError("");
 }
 async function save(event:React.FormEvent){
  event.preventDefault();
  if(form.serviceTypes.length===0){setError("Selecione pelo menos um tipo de atendimento.");return;}
  setBusy(true);setError("");
  try{
   if(partner)await partnersApi.update(partner.id,form);
   else await partnersApi.create(form);
   await onSaved();onClose();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar");}
  finally{setBusy(false);}
 }
 return <div className="partner-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
  <section className="partner-modal partner-modal-refined" role="dialog" aria-modal="true" aria-labelledby="partner-modal-title">
   <div className="partner-modal-header">
    <div><span className="partner-eyebrow">REDE CREDENCIADA</span>
     <h2 id="partner-modal-title" ref={titleRef} tabIndex={-1}>{partner?"Editar parceiro":"Novo parceiro"}</h2>
     <p>{partner?"Atualize os dados e a disponibilidade da unidade.":"Cadastre uma unidade e os tipos de atendimento oferecidos."}</p>
    </div>
    <button className="partner-icon-btn" type="button" aria-label="Fechar formulário" disabled={busy} onClick={onClose}><FiX size={21}/></button>
   </div>
   <form id="partner-entry-form" className="partner-modal-form partner-form-refined" onSubmit={save}>
    <div className="partner-form-section">
     <h3>Dados da unidade</h3>
     <div className="partner-form-grid">
      <label className="partner-field full">Nome do parceiro <span className="required">*</span>
       <input required maxLength={120} value={form.name} placeholder="Ex.: Unidade Centro"
        onChange={e=>update("name",e.target.value)}/></label>
      <div className="partner-field full">
       <span id="partner-types-label">Tipos de atendimento <span className="required">*</span></span>
       <AttendanceMultiSelect value={form.serviceTypes} onChange={updateTypes} disabled={busy}/>
       <small className="partner-help">Selecione quantos tipos a unidade oferecer.</small>
      </div>
      <label className="partner-field">Desconto (%) <span className="required">*</span>
       <input type="number" min={0} max={100} step={1} required value={form.discountPercent}
        onChange={e=>update("discountPercent",Number(e.target.value))}/></label>
      <label className="partner-field">Telefone de contato
       <input maxLength={30} type="tel" value={form.phone||""} placeholder="(21) 99999-9999"
        onChange={e=>update("phone",e.target.value)}/></label>
      <label className="partner-field full">Especialidades e serviços
       <textarea rows={2} maxLength={600} value={form.services} placeholder="Ex.: Cardiologia, Pediatria, exames laboratoriais"
        onChange={e=>update("services",e.target.value)}/></label>
     </div>
    </div>
    <div className="partner-form-section">
     <h3>Localização e funcionamento</h3>
     <div className="partner-form-grid">
      <label className="partner-field full">Endereço <span className="required">*</span>
       <input required maxLength={250} value={form.address} placeholder="Rua, número e bairro"
        onChange={e=>update("address",e.target.value)}/></label>
      <label className="partner-field full">Cidade / UF <span className="required">*</span>
       <input required maxLength={100} value={form.city} placeholder="Ex.: Niterói/RJ"
        onChange={e=>update("city",e.target.value)}/></label>
      <label className="partner-field full">Horário de funcionamento
       <input maxLength={250} value={form.businessHours} placeholder="Seg a sex: 8h às 17h"
        onChange={e=>update("businessHours",e.target.value)}/></label>
     </div>
    </div>
    <div className="partner-form-section">
     <label className="partner-status-field full">
      <input type="checkbox" checked={form.active} onChange={e=>update("active",e.target.checked)}/>
      <span><b>Parceiro ativo</b><small>Unidades inativas não aparecem no Clube Quali.</small></span>
     </label>
    </div>
    {error&&<div className="notice error" role="alert">{error}</div>}
   </form>
   <div className="partner-modal-actions partner-modal-footer">
    <button type="button" className="partner-secondary-btn" disabled={busy} onClick={onClose}>Cancelar</button>
    <button type="submit" form="partner-entry-form" className="partner-primary-btn" disabled={busy}>
     <FiCheck size={17}/>{busy?"Salvando...":partner?"Salvar alterações":"Cadastrar parceiro"}
    </button>
   </div>
  </section>
 </div>;
}
