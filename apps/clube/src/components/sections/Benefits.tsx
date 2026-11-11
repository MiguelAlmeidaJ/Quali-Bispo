"use client";
import Link from "next/link";
import {SectionHeading} from "../ui/SectionHeading";
import {useCatalog,centsMoney} from "../../hooks/useCatalog";
const benefitGroups=[
 {icon:"🩺",name:"Consultas médicas",detail:"Mais de 20 especialidades e atendimentos da rede parceira. Consulte as condições de uso do plano.",types:["CONSULTA"]},
 {icon:"💗",name:"Check-ups e exames",detail:"Avaliações preventivas e exames com preços especiais para associados.",types:["CHECKUP","EXAME","PROCEDIMENTO"]},
 {icon:"🧠",name:"Psicologia e nutrição",detail:"Atendimento com profissionais da rede para saúde e bem-estar.",types:["TERAPIA"]},
];
export function Benefits(){
 const {items,loading,error}=useCatalog();
 return <section className="sec alt" id="beneficios"><div className="wrap">
  <SectionHeading eyebrow="Benefícios" title="Descontos para cada momento da sua saúde">Confira uma amostra dos procedimentos disponíveis na nossa tabela.</SectionHeading>
  <div className="bens">{benefitGroups.map(b=>{
   const available=items.filter(item=>b.types.includes(item.category) && item.normalPriceCents>0);
   const pct=available.length?Math.max(...available.map(p=>Math.round((1-p.qualiPriceCents/p.normalPriceCents)*100))):null;
   return <article className="ben" key={b.name}>
    {pct!==null&&<span className="pct">até {pct}%</span>}
    <div className="ic">{b.icon}</div><h4>{b.name}</h4><p>{b.detail}</p>
    <ul>{available.slice(0,3).map(item=><li key={item.id}><span className="benefit-item-name">{item.name}</span><span className="benefit-price-stack"><del className="benefit-price-normal" aria-label={`Valor normal: ${centsMoney(item.normalPriceCents)}`}>{centsMoney(item.normalPriceCents)}</del><strong className="benefit-price-quali" aria-label={`Valor Quali: ${centsMoney(item.qualiPriceCents)}`}>{centsMoney(item.qualiPriceCents)}</strong></span></li>)}</ul>
    <Link href="/valores">Ver tabela completa →</Link>
   </article>;
  })}</div>
  {loading&&<p className="hint center spaced">Carregando benefícios...</p>}
  {error&&<p role="status" className="hint center spaced">Valores temporariamente indisponíveis.</p>}
  <p className="hint center spaced">Os valores podem mudar. Confirme a disponibilidade com o parceiro.</p>
 </div></section>;
}
