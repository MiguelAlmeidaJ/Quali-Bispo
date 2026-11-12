"use client";
import {useCallback,useEffect,useState} from "react";
import {Brand} from "../layout/Brand";

type Status="PAID"|"OPEN"|"EXPECTED"|"PENDING"|"IN_REVIEW"|"AWAITING"|"UNSPECIFIED";
type Attendance={id:string;performedAt:string;serviceName:string;serviceType:string;fullPriceCents:number;chargedCents:number;partner:{name:string}};
type Issue={id:string;status:Status;rawStatus:string|null;amountCents:number|null;referenceDate:string|null;paymentMethod:string|null};
type Partner={id:string;name:string;city:string;address:string;phone:string|null;businessHours:string;
 serviceType:string;serviceTypes:string[];discountPercent:number};
type Dashboard={
 member:{name:string;cpfLast4:string|null;birthDate:string|null;planType:string|null;amountCents:number|null;
 status:Status;unit:string|null;joinedAt:string;referenceDate:string|null};
 consultationsThisMonth:number;savingsCents:number;attendances:Attendance[];issues:Issue[];partners:Partner[];
 dependentsAvailable:boolean;cardNumber:null;phone:null;nextDueDate:null;consultationLimit:null;
};
type Tab="overview"|"benefits"|"partners"|"payments"|"attendances";
const labels:Record<Status,string>={PAID:"Pago",OPEN:"Em aberto",EXPECTED:"Previsto",
 PENDING:"Pendente",IN_REVIEW:"Em tratativa",AWAITING:"Aguardando",UNSPECIFIED:"Não informado"};
const money=(value:number|null)=>value===null?"Não informado":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
const date=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString("pt-BR",{timeZone:"UTC"}):"Não informado";
const tabs:{key:Tab;label:string}[]=[
 {key:"overview",label:"Visão geral"},{key:"benefits",label:"Meus benefícios"},
 {key:"partners",label:"Rede parceira"},{key:"payments",label:"Mensalidades"},
 {key:"attendances",label:"Meus atendimentos"},
];

export function MemberPortal(){
 const [data,setData]=useState<Dashboard|null>(null);
 const [tab,setTab]=useState<Tab>("overview");
 const [busy,setBusy]=useState(true),[error,setError]=useState(""),[unauthorized,setUnauthorized]=useState(false);
 const [search,setSearch]=useState("");
 const load=useCallback(async()=>{
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/associate/dashboard",{credentials:"same-origin",cache:"no-store"});
   if(response.status===401){setUnauthorized(true);return;}
   const result=await response.json();
   if(!response.ok)throw new Error(result.message||result.error||"Não foi possível consultar seus dados");
   setData(result as Dashboard);
  }catch(err){setError(err instanceof Error?err.message:"Falha ao carregar informações");}
  finally{setBusy(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function signOut(){
  await fetch("/api/associate/session",{method:"DELETE",credentials:"same-origin"});
  window.location.assign("/#acesso");
 }
 if(busy)return <main className="member-loading">Carregando sua área...</main>;
 if(unauthorized)return <main className="member-loading"><h1>Sessão encerrada</h1>
  <p>Entre novamente com CPF e data de nascimento.</p><a className="btn" href="/#acesso">Voltar ao acesso</a></main>;
 if(error||!data)return <main className="member-loading"><h1>Não foi possível carregar seus dados</h1>
  <p>{error||"Tente novamente."}</p><button className="btn" onClick={()=>void load()}>Tentar novamente</button></main>;
 const {member,attendances,issues,partners}=data;
 const firstName=member.name.split(" ")[0].toLocaleLowerCase("pt-BR");
 const greeting=firstName.charAt(0).toLocaleUpperCase("pt-BR")+firstName.slice(1);
 const statusOk=member.status==="PAID";
 const filteredPartners=partners.filter(p=>[p.name,p.city,p.address,...p.serviceTypes]
  .some(x=>x.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
 return <div className="member-portal">
  <header className="member-top"><div className="wrap member-top-inner">
   <a href="/" className="member-brand" aria-label="Início do Clube Quali"><Brand/></a>
   <button className="member-logout" onClick={()=>void signOut()}>Sair</button>
  </div></header>
  <div className="member-banner"><div className="wrap">
   <div className="member-banner-line"><div><span>Bem-vindo(a),</span><h1>{greeting}!</h1></div>
    <span className={`member-status ${statusOk?"is-paid":"is-pending"}`}>● {labels[member.status]}</span>
   </div>
   <nav aria-label="Menu do associado" className="member-tabs">{tabs.map(item=>
    <button type="button" key={item.key} className={tab===item.key?"current":""}
     aria-current={tab===item.key?"page":undefined} onClick={()=>setTab(item.key)}>{item.label}</button>)}</nav>
  </div></div>
  <main className="wrap member-content">
   {tab==="overview"&&<div className="member-layout">
    <aside className="member-left">
     <div className="member-card-preview">
      <div className="member-card-head"><Brand/><span>{member.planType||"PLANO QUALI"}</span></div>
      <strong>{member.name}</strong><div className="member-card-bottom"><span>CPF (final)<b>•••• {member.cpfLast4||"—"}</b></span>
       <span>Vínculo<b>Titular</b></span><span>Situação<b>{labels[member.status]}</b></span></div>
     </div>
     <div className="member-card-warning">A identificação acima é um resumo digital do cadastro, não uma carteirinha oficial. A emissão da carteirinha em PDF depende da habilitação do número do cartão.</div>
    </aside>
    <div className="member-right">
     <div className="member-metrics">
      <article><small>CONSULTAS MÉDICAS NO MÊS</small><strong>{data.consultationsThisMonth}</strong><span>Sem limite configurado no sistema</span></article>
      <article><small>VOCÊ JÁ ECONOMIZOU</small><strong className="green">{money(data.savingsCents)}</strong><span>Atendimentos registrados</span></article>
      <article><small>PRÓXIMO VENCIMENTO</small><strong>Não informado</strong><span>Data não disponível no cadastro</span></article>
     </div>
     <section className="member-panel"><h2>Meus dados</h2>
      <div className="member-details">
       <div><small>TITULAR</small><b>{member.name}</b></div>
       <div><small>CPF</small><b>Final {member.cpfLast4||"não informado"}</b></div>
       <div><small>NASCIMENTO</small><b>{date(member.birthDate)}</b></div>
       <div><small>PLANO</small><b>{member.planType||"Não informado"} {member.amountCents!==null?`· ${money(member.amountCents)}`:""}</b></div>
       <div><small>SITUAÇÃO</small><b>{labels[member.status]}</b></div>
       <div><small>CADASTRO NO SISTEMA</small><b>{date(member.joinedAt)}</b></div>
       <div><small>UNIDADE</small><b>{member.unit||"Não informada"}</b></div>
      </div>
      {!statusOk&&<div className="member-warning">Identificamos uma situação que precisa de acompanhamento. Consulte a aba Mensalidades ou fale com o suporte Quali para regularizar seu cadastro.</div>}
     </section>
     <section className="member-panel"><h2>Beneficiários</h2>
      <div className="member-table-wrap"><table><thead><tr><th>NOME</th><th>VÍNCULO</th><th>CPF</th><th>CONSULTAS NO MÊS</th></tr></thead><tbody>
       <tr><td>{member.name}</td><td>Titular</td><td>Final {member.cpfLast4||"—"}</td><td>{data.consultationsThisMonth}</td></tr>
      </tbody></table></div>
      <p className="member-muted">Dependentes não constam na base atual. Quando forem cadastrados, aparecerão aqui com acesso individual.</p>
     </section>
    </div>
   </div>}
   {tab==="benefits"&&<section className="member-panel"><h2>Meus benefícios</h2>
    <p className="member-muted">Consulte a rede credenciada e a tabela atualizada de valores Quali. A disponibilidade e as regras de uso dependem de confirmação com a unidade.</p>
    <div className="member-benefit-grid"><article><h3>Consultas médicas</h3><p>Valores diferenciados nas especialidades disponíveis.</p></article>
     <article><h3>Exames e check-ups</h3><p>Confira o catálogo atualizado antes de agendar.</p></article>
     <article><h3>Psicologia e nutrição</h3><p>Consulte profissionais e condições na rede credenciada.</p></article></div>
    <a className="btn" href="/valores">Consultar tabela de valores</a>
    <p className="member-muted">Consultas registradas neste mês: <b>{data.consultationsThisMonth}</b>. O limite mensal depende do plano e ainda não está parametrizado no sistema.</p>
   </section>}
   {tab==="partners"&&<section className="member-panel"><h2>Rede parceira</h2>
    <p className="member-muted">Unidades ativas que participam da rede Quali.</p>
    <input aria-label="Pesquisar unidade credenciada" className="member-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por unidade, cidade ou serviço"/>
    <div className="member-partners-grid">{filteredPartners.map(p=><article key={p.id}>
     <h3>{p.name}</h3><p>{p.address}{p.city?` · ${p.city}`:""}</p><p>{p.serviceTypes.length?p.serviceTypes.join(" · "):p.serviceType}</p>
     <b>Até {p.discountPercent}% de desconto</b>{p.phone&&<p>Telefone: {p.phone}</p>}
     {p.businessHours&&<p>Horário: {p.businessHours}</p>}
    </article>)}</div>
    {!filteredPartners.length&&<p className="member-muted">Nenhuma unidade encontrada.</p>}
   </section>}
   {tab==="payments"&&<section className="member-panel"><h2>Mensalidades</h2>
    <div className="member-pay-summary"><div><small>PLANO</small><b>{member.planType||"Não informado"}</b></div>
     <div><small>VALOR CADASTRADO</small><b>{money(member.amountCents)}</b></div>
     <div><small>SITUAÇÃO ATUAL</small><b>{labels[member.status]}</b></div></div>
    <p className="member-muted">A plataforma ainda não possui histórico completo de pagamentos bancários nem geração de segunda via. Os registros abaixo são pendências de acompanhamento vinculadas ao seu cadastro.</p>
    {issues.length?<div className="member-table-wrap"><table><thead><tr><th>SITUAÇÃO</th><th>VALOR</th><th>DATA DE REFERÊNCIA</th><th>FORMA</th></tr></thead>
     <tbody>{issues.map(issue=><tr key={issue.id}><td>{labels[issue.status]}</td><td>{money(issue.amountCents)}</td>
      <td>{date(issue.referenceDate)}</td><td>{issue.paymentMethod||"—"}</td></tr>)}</tbody></table></div>:
     <p className="member-muted">Não há pendências não resolvidas vinculadas a este cadastro. Isso não constitui comprovante de quitação.</p>}
   </section>}
   {tab==="attendances"&&<section className="member-panel"><h2>Meus atendimentos</h2>
    <p className="member-muted">Histórico registrado na rede Quali, com valores da época de cada atendimento.</p>
    {attendances.length?<div className="member-table-wrap"><table><thead><tr><th>DATA</th><th>PROCEDIMENTO</th><th>PARCEIRO</th><th>VALOR CHEIO</th><th>VALOR QUALI</th><th>ECONOMIA</th></tr></thead>
     <tbody>{attendances.map(item=><tr key={item.id}><td>{date(item.performedAt)}</td>
      <td>{item.serviceName}</td><td>{item.partner.name}</td><td>{money(item.fullPriceCents)}</td>
      <td>{money(item.chargedCents)}</td><td className="green">{money(item.fullPriceCents-item.chargedCents)}</td></tr>)}</tbody></table></div>:
     <p className="member-muted">Ainda não há atendimentos registrados no seu cadastro.</p>}
    {attendances.length===100&&<p className="member-muted">Mostrando os 100 atendimentos mais recentes. Para histórico anterior, consulte o suporte Quali.</p>}
   </section>}
  </main>
 </div>;
}
