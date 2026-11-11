"use client";
import { useMemo,useState } from "react";
import { partners } from "../../data/catalog";
import { SectionHeading } from "../ui/SectionHeading";
export function Partners(){
 const [query,setQuery]=useState("");const [city,setCity]=useState("");const [sort,setSort]=useState("name");
 const filtered=useMemo(()=>partners.filter(p=>(!city||p.city===city)&&`${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==="discount"?b.discount-a.discount:a.name.localeCompare(b.name)),[query,city,sort]);
 return <section className="sec" id="rede"><div className="wrap"><SectionHeading eyebrow="Rede credenciada" title="Nossas unidades em Niterói e São Gonçalo">🕘 Segunda a sexta, das 8h às 17h · Sábado, das 8h às 12h · Domingo fechado</SectionHeading>
 <div className="rede-f"><input placeholder="Buscar por nome ou especialidade" aria-label="Buscar unidade" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filtrar cidade" value={city} onChange={e=>setCity(e.target.value)}><option value="">Todas as cidades</option><option value="Niterói/RJ">Niterói</option><option value="São Gonçalo/RJ">São Gonçalo</option></select><select aria-label="Ordenar unidades" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Ordenar por nome</option><option value="discount">Maior desconto</option></select></div>
 <div className="chips"><button className={city===""?"chip on":"chip"} onClick={()=>setCity("")}>Todos</button><button className={city==="Niterói/RJ"?"chip on":"chip"} onClick={()=>setCity("Niterói/RJ")}>Niterói</button><button className={city==="São Gonçalo/RJ"?"chip on":"chip"} onClick={()=>setCity("São Gonçalo/RJ")}>São Gonçalo</button></div>
 <div className="parc">{filtered.map(p=><article className="partner-card" key={p.name}><span className="partner-discount">até {p.discount}%</span><h4>{p.name}</h4><p>Consultas, check-ups, psicologia e nutrição</p><p>📍 {p.address} · {p.city}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address+", "+p.city)}`} target="_blank" rel="noopener noreferrer">Ver no mapa →</a></article>)}</div></div></section>;
}
