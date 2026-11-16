"use client";
import {Brand} from "../layout/Brand";
import type {Dashboard} from "./member-types";
import {date} from "./member-types";

type Card={id?:string;name:string;cpfLast4:string|null;birthDate:string|null;cardNumber:string|null;relationship:"Titular"|"Dependente"};
export function MemberCardsTab({data}:{data:Dashboard}){
 const isDependent=data.accessKind==="dependent";
 const cards:Card[]=[
  {name:data.member.name,cpfLast4:data.member.cpfLast4,birthDate:data.member.birthDate,
   cardNumber:data.member.cardNumber,relationship:isDependent?"Dependente":"Titular"},
  ...(!isDependent?data.dependents.map(item=>({...item,relationship:"Dependente" as const})):[]),
 ];
 return <section className="member-modern-tab" aria-labelledby="member-cards-title">
  <div className="member-section-intro">
   <div><span className="member-eyebrow">IDENTIFICAÇÃO QUALI</span>
    <h2 id="member-cards-title">Meus cartões de benefícios</h2>
    <p>{isDependent?"Seu cartão individual está disponível abaixo.":"Consulte e baixe o cartão individual de cada beneficiário da família."}</p>
   </div>
  </div>
  <div className="member-cards-gallery">{cards.map(card=>
   <article className="member-cards-entry" key={card.id||"titular"}>
    <div className="member-cards-entry-heading"><strong>{card.name}</strong><span>{card.relationship}</span></div>
    <div className="member-card-preview" aria-label={`Cartão de ${card.name}`}>
     <div className="member-card-head"><span className="member-card-logo">
      <img className="member-card-white-logo" src="/v1/branding/assets/logo-white" alt="Quali Benefícios"/>
      <span className="member-card-logo-fallback"><Brand/></span>
     </span></div>
     <div className="member-card-main">
      <div className={`member-card-number ${card.cardNumber?"":"member-card-number-pending"}`}>
       {card.cardNumber?card.cardNumber.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3"):"AGUARDANDO EMISSÃO"}
      </div>
      <strong className="member-card-holder">{card.name}</strong>
     </div>
     <div className="member-card-bottom">
      <span>CPF (final)<b>•••• {card.cpfLast4||"—"}</b></span>
      <span>Vínculo<b>{card.relationship}</b></span>
      <span>Nascimento<b>{date(card.birthDate)}</b></span>
     </div>
    </div>
    {card.cardNumber&&card.birthDate&&card.cpfLast4?
     <a className="member-download-card" href={card.id?`/api/associate/card?dependentId=${encodeURIComponent(card.id)}`:"/api/associate/card"}>
      <span aria-hidden="true">↓</span> Baixar cartão (PDF)
     </a>:
     <p className="member-card-warning">Cartão indisponível para PDF. Confirme os dados cadastrais com a Quali.</p>}
   </article>
  )}</div>
  <p className="member-card-print-note">Todos os PDFs mantêm o modelo e as cores originais, no tamanho físico de 85,60 × 53,98 mm.</p>
 </section>;
}
