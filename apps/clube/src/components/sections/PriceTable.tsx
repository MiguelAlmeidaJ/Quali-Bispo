"use client";
import { useMemo,useState } from "react";
import { money,procedures, type Category } from "../../data/catalog";
import { SectionHeading } from "../ui/SectionHeading";
export function PriceTable(){
 const [query,setQuery]=useState("");const [category,setCategory]=useState<Category| "">("");
 const filtered=useMemo(()=>procedures.filter(p=>(!category||p.category===category)&&(`${p.specialty} ${p.professional}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))),[category,query]);
 return <section className="sec" id="valores"><div className="wrap">
 <SectionHeading eyebrow="Tabela de valores" title="Quanto você paga com o Cartão Quali">Compare o valor normal com o valor para associados.</SectionHeading>
 <div className="rede-f price-filters"><input aria-label="Buscar especialidade ou profissional" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar especialidade ou profissional"/><select aria-label="Filtrar categoria" value={category} onChange={e=>setCategory(e.target.value as Category|"")}><option value="">Todos os tipos</option><option value="cons">Consultas médicas</option><option value="check">Check-ups</option><option value="terap">Psicologia e nutrição</option></select></div>
 <div className="tbl-wrap"><table><thead><tr><th>Especialidade / procedimento</th><th>Profissional</th><th>Valor normal</th><th>Valor Quali</th><th>Você economiza</th></tr></thead><tbody>{filtered.map((p,i)=><tr key={`${p.specialty}-${i}`}><td><b>{p.specialty}</b>{p.category==="check"&&<span className="badge-info">sem limite mensal</span>}</td><td>{p.professional||"A confirmar"}</td><td>{money(p.normal)}</td><td className="green"><b>{money(p.quali)}</b></td><td>{Math.round((1-p.quali/p.normal)*100)}% ({money(p.normal-p.quali)})</td></tr>)}</tbody></table>{filtered.length===0&&<p className="empty">Nenhum procedimento encontrado.</p>}</div>
 <p className="hint spaced">Consultas médicas, psicologia e nutrição: até 3 por mês por beneficiário (somadas). Valores sujeitos a alteração sem aviso prévio.</p>
 </div></section>;
}
