"use client";
import {useMemo,useState} from "react";
import type {Partner} from "./member-types";
const types=["Todos","Consultas médicas","Exames e check-ups","Psicologia","Nutrição","Odontologia","Outros"];
const clean=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function MemberPartnersTab({partners}:{partners:Partner[]}){
 const [search,setSearch]=useState(""),[city,setCity]=useState(""),[type,setType]=useState("Todos"),[order,setOrder]=useState("name");
 const cities=useMemo(()=>[...new Set(partners.map(p=>p.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")),[partners]);
 const availableTypes=types.filter(t=>t==="Todos"||partners.some(p=>p.serviceTypes.includes(t)||p.serviceType===t));
 const filtered=useMemo(()=>partners.filter(p=>{
  const haystack=clean([p.name,p.services,p.city,p.address,...p.serviceTypes].join(" "));
  return haystack.includes(clean(search.trim()))&&(!city||p.city===city)&&
   (type==="Todos"||p.serviceTypes.includes(type)||p.serviceType===type);
 }).sort((a,b)=>order==="city"?a.city.localeCompare(b.city,"pt-BR")||a.name.localeCompare(b.name,"pt-BR"):
  order==="discount"?b.discountPercent-a.discountPercent||a.name.localeCompare(b.name,"pt-BR"):
  a.name.localeCompare(b.name,"pt-BR")),[partners,search,city,type,order]);
 return <section className="member-modern-tab" aria-labelledby="member-partners-title">
  <div className="member-section-intro"><div><span className="member-eyebrow">REDE CREDENCIADA</span><h2 id="member-partners-title">Rede parceira</h2>
   <p>Encontre unidades por nome, especialidade ou cidade.</p></div><span className="member-result-count">{filtered.length} unidade(s)</span></div>
  <div className="member-partner-filters">
   <label><span>Buscar</span><input type="search" placeholder="Nome, serviço ou especialidade" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <label><span>Cidade</span><select value={city} onChange={e=>setCity(e.target.value)}><option value="">Todas as cidades</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
   <label><span>Ordenar</span><select value={order} onChange={e=>setOrder(e.target.value)}><option value="name">Nome (A–Z)</option><option value="city">Cidade</option><option value="discount">Maior desconto</option></select></label>
  </div>
  <div className="member-type-chips" aria-label="Filtrar por atendimento">{availableTypes.map(value=>
   <button type="button" key={value} className={type===value?"active":""} aria-pressed={type===value} onClick={()=>setType(value)}>{value}</button>
  )}</div>
  {filtered.length?<div className="member-partner-grid">{filtered.map(p=><article className="member-partner-card" key={p.id}>
   <div className="member-partner-card-head"><span className="member-category-pill">{p.serviceTypes[0]||p.serviceType}</span><strong>até {p.discountPercent}%</strong></div>
   <h3>{p.name}</h3><p className="member-partner-services">{p.services||p.serviceTypes.join(", ")||p.serviceType}</p>
   <div className="member-partner-info"><span><b>Local</b>{p.address}{p.city?` · ${p.city}`:""}</span>
    {p.businessHours&&<span><b>Horário</b>{p.businessHours}</span>}
    {p.phone&&<span><b>Contato</b>{p.phone}</span>}</div>
   <a className="member-map-link" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.address,p.city].filter(Boolean).join(", "))}`}>Ver no mapa ↗</a>
  </article>)}</div>:<div className="member-no-results"><strong>Nenhuma unidade encontrada</strong><p>Tente outra cidade, especialidade ou nome.</p>
   <button type="button" onClick={()=>{setSearch("");setCity("");setType("Todos");setOrder("name");}}>Limpar filtros</button></div>}
 </section>;
}
