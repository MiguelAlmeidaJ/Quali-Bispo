"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {SectionHeading} from "../ui/SectionHeading";
import {useCatalog,centsMoney} from "../../hooks/useCatalog";
type Category="CONSULTA"|"CHECKUP"|"EXAME"|"PROCEDIMENTO"|"TERAPIA";
const categories:Record<Category,string>={
 CONSULTA:"Consultas",CHECKUP:"Check-ups",EXAME:"Exames",PROCEDIMENTO:"Procedimentos",TERAPIA:"Terapias",
};
export function PriceTable({full=false}:{full?:boolean}){
 const {items,loading,error}=useCatalog();
 const [query,setQuery]=useState(""),[category,setCategory]=useState(""),[page,setPage]=useState(1);
 const pageSize=full?20:15;
 const filtered=useMemo(()=>items.filter(item=>(!category||item.category===category)
  &&[item.name,item.professional||"",item.group,item.notes||""].some(value=>value.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))),[items,category,query]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const currentPage=Math.min(page,totalPages);
 const displayed=full?filtered.slice((currentPage-1)*pageSize,currentPage*pageSize):filtered.slice(0,15);
 function updateSearch(value:string){setQuery(value);setPage(1);}
 function updateCategory(value:string){setCategory(value);setPage(1);}
 return <section className="sec" id="valores"><div className="wrap">
 <SectionHeading eyebrow="Tabela de valores" title="Quanto você paga com o Cartão Quali">
  {full?"Consulte todos os procedimentos disponíveis, com preços atualizados pela rede Quali.":"Confira uma seleção de valores para associados do Clube Quali."}
 </SectionHeading>
 <div className="rede-f price-filters">
  <input aria-label="Buscar especialidade, exame ou profissional" value={query} onChange={e=>updateSearch(e.target.value)} placeholder="Buscar consulta, exame ou profissional"/>
  <select aria-label="Filtrar categoria" value={category} onChange={e=>updateCategory(e.target.value)}>
   <option value="">Todas as categorias</option>{(Object.entries(categories) as [Category,string][]).map(([key,label])=><option key={key} value={key}>{label}</option>)}
  </select>
 </div>
 <div className="tbl-wrap"><table><thead><tr><th>Especialidade / procedimento</th><th>Profissional / grupo</th><th>Valor normal</th><th>Valor Quali</th><th>Você economiza</th></tr></thead>
 <tbody>{displayed.map(item=><tr key={item.id}>
  <td><b>{item.name}</b>{item.notes&&<small className="catalog-note">{item.notes}</small>}</td>
  <td>{item.professional||item.group}</td>
  <td>{centsMoney(item.normalPriceCents)}</td>
  <td className="green"><b>{centsMoney(item.qualiPriceCents)}</b></td>
  <td>{Math.round((1-item.qualiPriceCents/item.normalPriceCents)*100)}% ({centsMoney(item.normalPriceCents-item.qualiPriceCents)})</td>
 </tr>)}</tbody></table>
 {loading&&<p className="empty">Carregando tabela de valores...</p>}
 {!loading&&error&&<p className="empty" role="alert">{error}. Tente novamente mais tarde.</p>}
 {!loading&&!error&&filtered.length===0&&<p className="empty">Nenhum procedimento disponível para sua busca.</p>}
 </div>
 {!loading&&!error&&filtered.length>0&&<div className="public-values-footer">
  <span>{full?`Exibindo ${(currentPage-1)*pageSize+1}–${Math.min(currentPage*pageSize,filtered.length)} de ${filtered.length} procedimentos`:`Exibindo até 15 de ${filtered.length} procedimentos`}</span>
  {full?<nav className="public-values-pagination" aria-label="Paginação dos valores">
   <button type="button" disabled={currentPage===1} onClick={()=>setPage(v=>Math.max(1,v-1))}>Anterior</button>
   <span>Página {currentPage} de {totalPages}</span>
   <button type="button" disabled={currentPage>=totalPages} onClick={()=>setPage(v=>Math.min(totalPages,v+1))}>Próxima</button>
  </nav>:<Link href="/valores" className="btn values-more-link">Ver mais valores →</Link>}
 </div>}
 <p className="hint spaced">Os preços podem ser atualizados pela rede Quali. Confirme a disponibilidade e as condições diretamente com o parceiro.</p>
 </div></section>;
}
