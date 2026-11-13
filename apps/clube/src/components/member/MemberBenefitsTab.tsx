"use client";
import Link from "next/link";
import type {CatalogItem,Dashboard} from "./member-types";
import {money} from "./member-types";
const groups=[
 {title:"Consultas médicas",icon:"🩺",categories:["CONSULTA"],description:"Especialidades médicas com condições diferenciadas na rede Quali."},
 {title:"Check-ups e exames",icon:"💗",categories:["CHECKUP","EXAME","PROCEDIMENTO"],description:"Avaliações preventivas, exames e procedimentos com preços especiais."},
 {title:"Psicologia e nutrição",icon:"🧠",categories:["TERAPIA"],description:"Atendimentos e terapias de saúde e bem-estar disponíveis no catálogo."},
];
const discount=(item:CatalogItem)=>item.normalPriceCents>0?Math.round(100*(1-item.qualiPriceCents/item.normalPriceCents)):0;
export function MemberBenefitsTab({data}:{data:Dashboard}){
 return <section className="member-modern-tab" aria-labelledby="member-benefits-title">
  <div className="member-section-intro"><div><span className="member-eyebrow">SAÚDE E BEM-ESTAR</span><h2 id="member-benefits-title">Meus benefícios</h2>
   <p>Veja os valores normais e os valores Quali atualizados diretamente da tabela oficial.</p></div>
   <Link href="/valores" className="member-outline-link">Tabela completa ↗</Link></div>
  <div className="member-benefits-grid">{groups.map(group=>{
   const items=data.catalog.filter(item=>group.categories.includes(item.category)&&item.normalPriceCents>0);
   const max=items.length?Math.max(...items.map(discount)):null;
   return <article className="member-benefit-card" key={group.title}>
    <div className="member-benefit-top"><span className="member-benefit-icon" aria-hidden="true">{group.icon}</span>
     {max!==null&&<span className="member-discount-tag">até {max}%</span>}</div>
    <h3>{group.title}</h3><p>{group.description}</p>
    <div className="member-benefit-items">{items.slice(0,3).map(item=><div className="member-benefit-item" key={item.id}>
     <span>{item.name}</span><div className="member-benefit-price"><del>{money(item.normalPriceCents)}</del><strong>{money(item.qualiPriceCents)}</strong></div>
    </div>)}
    {!items.length&&<p className="member-empty-mini">Nenhum procedimento ativo nesta categoria no momento.</p>}</div>
    <Link href="/valores" className="member-benefit-link">Ver todos os valores →</Link>
   </article>;
  })}</div>
  {data.member.cardPlan?.benefits.length? <div className="member-plan-includes"><strong>Seu cartão {data.member.cardPlan.name} inclui:</strong>
   <span>{data.member.cardPlan.benefits.join(" · ")}</span></div>:null}
  <p className="member-helper">Para utilizar, agende diretamente com o parceiro e apresente sua identificação Quali com documento oficial. A disponibilidade e a elegibilidade devem ser confirmadas com a unidade. O limite de consultas depende do plano e ainda não está parametrizado.</p>
 </section>;
}
