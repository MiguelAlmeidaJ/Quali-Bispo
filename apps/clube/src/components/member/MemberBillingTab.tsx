"use client";
import type {Dashboard} from "./member-types";
import {date,money,statuses} from "./member-types";
export function MemberBillingTab({data}:{data:Dashboard}){
 const {member,issues}=data;
 const openCents=issues.reduce((sum,item)=>sum+(item.amountCents??0),0);
 return <section className="member-modern-tab" aria-labelledby="member-billing-title">
  <div className="member-section-intro"><div><span className="member-eyebrow">PLANO E FINANCEIRO</span><h2 id="member-billing-title">Mensalidades</h2>
   <p>Consulte o valor do seu plano e os lançamentos de pendências vinculados ao cadastro.</p></div></div>
  <div className="member-stat-grid">
   <article className="member-stat"><small>MENSALIDADE</small><strong>{money(member.amountCents)}</strong><span>{member.cardPlan?.name||member.planType||"Plano não informado"}</span></article>
   <article className="member-stat"><small>PAGAS (ÚLTIMOS 12 MESES)</small><strong>—</strong><span>Histórico de recebimentos indisponível</span></article>
   <article className="member-stat"><small>PENDÊNCIAS REGISTRADAS</small><strong className={issues.length?"member-stat-alert":""}>{money(openCents)}</strong><span>{issues.length} registro(s) em acompanhamento</span></article>
  </div>
  <section className="member-data-card"><div className="member-data-heading"><h3>Registros financeiros</h3><span className="member-status-pill">{statuses[member.status]}</span></div>
   {issues.length?<div className="member-data-scroll"><table className="member-data-table"><thead><tr><th>REFERÊNCIA</th><th>VALOR</th><th>SITUAÇÃO</th><th>FORMA DE PAGAMENTO</th></tr></thead>
    <tbody>{issues.map(item=><tr key={item.id}><td>{date(item.referenceDate)}</td><td className="member-number">{money(item.amountCents)}</td>
     <td><span className={`member-status-pill ${item.status==="PAID"?"paid":"pending"}`}>{statuses[item.status]}</span></td><td>{item.paymentMethod||"Não informada"}</td></tr>)}</tbody></table></div>:
    <div className="member-no-results"><strong>Sem pendências registradas</strong><p>Este painel não confirma quitação. Consulte o suporte para informações sobre recebimentos.</p></div>}
  </section>
  <p className="member-helper">As competências mensais, vencimentos e pagamentos efetivamente recebidos ainda não estão estruturados na base financeira. Por isso não exibimos meses fictícios, contagem de mensalidades pagas ou datas presumidas.</p>
 </section>;
}
