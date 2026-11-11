"use client";
import {useEffect,useMemo,useState} from "react";
import {SectionHeading} from "../ui/SectionHeading";
type Category="CONSULTA"|"CHECKUP"|"EXAME"|"PROCEDIMENTO"|"TERAPIA";
type Item={id:string;name:string;category:Category;group:string;professional:string|null;notes:string|null;normalPriceCents:number;qualiPriceCents:number;active:boolean};
const categories:Record<Category,string>={CONSULTA:"Consultas",CHECKUP:"Check-ups",EXAME:"Exames",PROCEDIMENTO:"Procedimentos",TERAPIA:"Terapias"};
const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
export function PriceTable(){
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [query,setQuery]=useState(""),[category,setCategory]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/v1/catalog",{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error("Não foi possível consultar os valores");return response.json() as Promise<Item[]>})
   .then(setItems).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Erro na tabela")})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[]);
 const filtered=useMemo(()=>items.filter(item=>(!category||item.category===category)
  &&[item.name,item.professional||"",item.group,item.notes||""].some(value=>value.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))),[items,category,query]);
 return <section className="sec" id="valores"><div className="wrap">
 <SectionHeading eyebrow="Tabela de valores" title="Quanto você paga com o Cartão Quali">Consulte as consultas, exames e procedimentos disponíveis com valores especiais.</SectionHeading>
 <div className="rede-f price-filters">
  <input aria-label="Buscar especialidade, exame ou profissional" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar consulta, exame ou profissional"/>
  <select aria-label="Filtrar categoria" value={category} onChange={e=>setCategory(e.target.value)}>
   <option value="">Todas as categorias</option>{(Object.entries(categories) as [Category,string][]).map(([key,label])=><option key={key} value={key}>{label}</option>)}
  </select>
 </div>
 <div className="tbl-wrap"><table><thead><tr><th>Especialidade / procedimento</th><th>Profissional / grupo</th><th>Valor normal</th><th>Valor Quali</th><th>Você economiza</th></tr></thead>
  <tbody>{filtered.map(item=><tr key={item.id}><td><b>{item.name}</b>{item.notes&&<small style={{display:"block",color:"#5a6a7b"}}>{item.notes}</small>}</td><td>{item.professional||item.group}</td><td>{money(item.normalPriceCents)}</td><td className="green"><b>{money(item.qualiPriceCents)}</b></td>
   <td>{Math.round((1-item.qualiPriceCents/item.normalPriceCents)*100)}% ({money(item.normalPriceCents-item.qualiPriceCents)})</td></tr>)}</tbody></table>
  {loading&&<p className="empty">Carregando tabela de valores...</p>}
  {!loading&&error&&<p className="empty" role="alert">{error}. Tente novamente mais tarde.</p>}
  {!loading&&!error&&filtered.length===0&&<p className="empty">Nenhum procedimento disponível para sua busca.</p>}
 </div>
 <p className="hint spaced">Os preços podem ser atualizados pela rede Quali. A disponibilidade e as condições de cada procedimento devem ser confirmadas com o parceiro.</p>
 </div></section>;
}
