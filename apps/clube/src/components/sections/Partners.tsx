"use client";
import {useEffect,useMemo,useState} from "react";
import {SectionHeading} from "../ui/SectionHeading";
type Partner = {id:string;name:string;serviceType:string;serviceTypes?:string[];services:string;address:string;city:string;phone:string|null;businessHours:string;discountPercent:number};
export function Partners(){
 const[partners,setPartners]=useState<Partner[]>([]);
 const[loading,setLoading]=useState(true),[error,setError]=useState("");
 const[query,setQuery]=useState(""),[city,setCity]=useState(""),[sort,setSort]=useState("name");
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/v1/partners",{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error("Não foi possível carregar a rede credenciada");return response.json() as Promise<Partner[]>})
   .then(setPartners)
   .catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Erro na consulta")})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[]);
 const cities=useMemo(()=>Array.from(new Set(partners.map(p=>p.city))).sort((a,b)=>a.localeCompare(b,"pt-BR")),[partners]);
 const filtered=useMemo(()=>partners
  .filter(p=>(!city||p.city===city)&&[p.name,p.address,p.services,p.serviceType,...(p.serviceTypes||[])].some(value=>value.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))))
  .sort((a,b)=>sort==="discount"?b.discountPercent-a.discountPercent:a.name.localeCompare(b.name,"pt-BR")),[partners,city,query,sort]);
 return <section className="sec" id="rede"><div className="wrap">
  <SectionHeading eyebrow="Rede credenciada" title="Nossas unidades e parceiros">Conheça a rede Quali, consulte os horários e encontre atendimento perto de você.</SectionHeading>
  <div className="rede-f">
   <input placeholder="Buscar unidade ou especialidade" aria-label="Buscar unidade" value={query} onChange={e=>setQuery(e.target.value)}/>
   <select aria-label="Filtrar cidade" value={city} onChange={e=>setCity(e.target.value)}>
    <option value="">Todas as cidades</option>{cities.map(value=><option key={value} value={value}>{value}</option>)}
   </select>
   <select aria-label="Ordenar unidades" value={sort} onChange={e=>setSort(e.target.value)}>
    <option value="name">Ordenar por nome</option><option value="discount">Maior desconto</option>
   </select>
  </div>
  <div className="chips"><button className={!city?"chip on":"chip"} onClick={()=>setCity("")}>Todos</button>{cities.map(value=><button key={value} className={city===value?"chip on":"chip"} onClick={()=>setCity(value)}>{value}</button>)}</div>
  {loading?<p className="hint center">Carregando unidades credenciadas...</p>:
   error?<p className="hint center" role="alert">{error}. Tente novamente mais tarde.</p>:
   filtered.length===0?<p className="hint center">Nenhuma unidade disponível para os filtros selecionados.</p>:
   <div className="parc">{filtered.map(p=><article className="partner-card" key={p.id}>
    <span className="partner-discount">até {p.discountPercent}%</span><h4>{p.name}</h4>
    <p>{p.serviceTypes?.length?p.serviceTypes.join(" · "):p.serviceType}</p>{p.services&&<p>{p.services}</p>}<p>📍 {p.address} · {p.city}</p>
    {p.businessHours&&<p>🕘 {p.businessHours}</p>}
    {p.phone&&<p>☎ {p.phone}</p>}
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address+", "+p.city)}`} target="_blank" rel="noopener noreferrer">Ver no mapa →</a>
   </article>)}</div>}
 </div></section>;
}
