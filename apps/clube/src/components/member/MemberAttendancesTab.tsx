"use client";
import type {Dashboard} from "./member-types";
import {date,money} from "./member-types";
export function MemberAttendancesTab({data}:{data:Dashboard}){
 const {attendances,attendanceTotals}=data;
 return <section className="member-modern-tab" aria-labelledby="member-attendance-title">
  <div className="member-section-intro"><div><span className="member-eyebrow">HISTÓRICO DE UTILIZAÇÃO</span><h2 id="member-attendance-title">Meus atendimentos</h2>
   <p>Confira os procedimentos registrados, o valor cobrado e a economia obtida.</p></div></div>
  <div className="member-stat-grid">
   <article className="member-stat"><small>VALOR CHEIO</small><strong>{money(attendanceTotals.fullPriceCents)}</strong><span>Total registrado</span></article>
   <article className="member-stat"><small>VOCÊ PAGOU</small><strong>{money(attendanceTotals.chargedCents)}</strong><span>Valor dos atendimentos registrados</span></article>
   <article className="member-stat"><small>ECONOMIA TOTAL</small><strong className="member-stat-success">{money(attendanceTotals.savingsCents)}</strong><span>{attendanceTotals.count} atendimento(s)</span></article>
  </div>
  <section className="member-data-card"><div className="member-data-heading"><h3>Histórico de atendimentos</h3><span>{attendances.length} exibido(s)</span></div>
   {attendances.length?<div className="member-data-scroll"><table className="member-data-table"><thead><tr><th>DATA</th><th>BENEFICIÁRIO</th><th>TIPO</th><th>PARCEIRO</th><th>SERVIÇO</th><th>VALOR CHEIO</th><th>VOCÊ PAGOU</th><th>ECONOMIA</th></tr></thead>
    <tbody>{attendances.map(item=><tr key={item.id}><td>{date(item.performedAt)}</td><td>{data.member.name}</td>
     <td>{item.serviceType}</td><td>{item.partner.name}</td><td>{item.serviceName}</td>
     <td className="member-number">{money(item.fullPriceCents)}</td><td className="member-number">{money(item.chargedCents)}</td>
     <td className="member-number member-stat-success">{money(item.fullPriceCents-item.chargedCents)}</td></tr>)}</tbody></table></div>:
    <div className="member-no-results"><strong>Nenhum atendimento registrado</strong><p>Os atendimentos aparecerão aqui após serem lançados pela unidade credenciada.</p></div>}
  </section>
  {attendanceTotals.count>attendances.length&&<p className="member-helper">Exibindo os {attendances.length} registros mais recentes de {attendanceTotals.count}. Os totais incluem todo o histórico não cancelado.</p>}
  <p className="member-helper">Valores registrados pelo parceiro na época do atendimento. Registros cancelados não entram neste histórico.</p>
 </section>;
}
