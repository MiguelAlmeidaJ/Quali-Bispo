"use client";
import {useCallback,useEffect,useState} from "react";
import {Brand} from "../layout/Brand";

import type {Dashboard} from "./member-types";
import {statuses as labels,money,date} from "./member-types";
import {MemberBenefitsTab} from "./MemberBenefitsTab";
import {MemberPartnersTab} from "./MemberPartnersTab";
import {MemberBillingTab} from "./MemberBillingTab";
import {MemberAttendancesTab} from "./MemberAttendancesTab";

type Tab="overview"|"benefits"|"partners"|"payments"|"attendances";
const tabs:{key:Tab;label:string}[]=[
 {key:"overview",label:"Visão geral"},{key:"benefits",label:"Meus benefícios"},
 {key:"partners",label:"Rede parceira"},{key:"payments",label:"Mensalidades"},
 {key:"attendances",label:"Meus atendimentos"},
];

export function MemberPortal(){
 const [data,setData]=useState<Dashboard|null>(null);
 const [tab,setTab]=useState<Tab>("overview");
 const [busy,setBusy]=useState(true),[error,setError]=useState(""),[unauthorized,setUnauthorized]=useState(false);
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
 const {member}=data;
 const firstName=member.name.split(" ")[0].toLocaleLowerCase("pt-BR");
 const greeting=firstName.charAt(0).toLocaleUpperCase("pt-BR")+firstName.slice(1);
 const statusOk=member.status==="PAID";
 const isDependent=data.accessKind==="dependent";
 return <div className="member-portal">
  <header className="member-top"><div className="wrap member-top-inner">
   <a href="/" className="member-brand" aria-label="Início do Clube Quali"><Brand/></a>
   <button className="member-logout" onClick={()=>void signOut()}>Sair</button>
  </div></header>
  <div className="member-banner"><div className="wrap">
   <div className="member-banner-line"><div><span>Bem-vindo(a),</span><h1>{greeting}!</h1></div>
    <span className={`member-status ${statusOk?"is-paid":"is-pending"}`}>● {labels[member.status]}</span>
   </div>
   <nav aria-label="Menu do associado" className="member-tabs">{tabs.filter(item=>!isDependent||!["payments","attendances"].includes(item.key)).map(item=>
    <button type="button" key={item.key} className={tab===item.key?"current":""}
     aria-current={tab===item.key?"page":undefined} onClick={()=>setTab(item.key)}>{item.label}</button>)}</nav>
  </div></div>
  <main className="wrap member-content">
   {tab==="overview"&&<div className="member-layout">
    <aside className="member-left">
     <div className="member-card-preview" aria-label="Cartão digital de identificação do associado">
      <div className="member-card-head">
       <span className="member-card-logo">
        <img className="member-card-white-logo" src="/v1/branding/assets/logo-white" alt="Quali Benefícios" />
        <span className="member-card-logo-fallback"><Brand/></span>
       </span>
       
      </div>
      <div className="member-card-main">
       <div className={`member-card-number ${member.cardNumber?"":"member-card-number-pending"}`}>
        {member.cardNumber?member.cardNumber.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3"):"AGUARDANDO EMISSÃO"}
       </div>
       <strong className="member-card-holder">{member.name}</strong>
      </div>
      <div className="member-card-bottom">
       <span>CPF (final)<b>•••• {member.cpfLast4||"—"}</b></span>
       <span>Vínculo<b>{isDependent?"Dependente":"Titular"}</b></span>
       <span>Nascimento<b>{date(member.birthDate)}</b></span>
      </div>
     </div>
     {member.cardNumber&&member.birthDate?
      <a href="/api/associate/card" className="member-download-card">
       <span aria-hidden="true">↓</span> Baixar Cartão de Benefícios (PDF)
      </a>:
      <div className="member-card-warning">Emissão pendente: confirme CPF e data de nascimento no cadastro administrativo.</div>}
     <p className="member-card-print-note">PDF em tamanho real de cartão (85,60 × 53,98 mm), sem margens ou informações adicionais.</p>
    </aside>
    <div className="member-right">
     {!isDependent&&<div className="member-metrics">
      <article><small>CONSULTAS MÉDICAS NO MÊS</small><strong>{data.consultationsThisMonth}</strong><span>Sem limite configurado no sistema</span></article>
      <article><small>VOCÊ JÁ ECONOMIZOU</small><strong className="green">{money(data.savingsCents)}</strong><span>Atendimentos registrados</span></article>
      <article><small>PRÓXIMO VENCIMENTO</small><strong>Não informado</strong><span>Data não disponível no cadastro</span></article>
     </div>}
     {isDependent&&<div className="member-dependent-note">Cartão de dependente vinculado ao titular. Seus benefícios podem ser consultados nas abas Meus benefícios e Rede parceira.</div>}
     <section className="member-panel"><h2>Meus dados</h2>
      <div className="member-details">
       <div><small>{isDependent?"BENEFICIÁRIO":"TITULAR"}</small><b>{member.name}</b></div>
       <div><small>CPF</small><b>Final {member.cpfLast4||"não informado"}</b></div>
       <div><small>NASCIMENTO</small><b>{date(member.birthDate)}</b></div>
       <div><small>PLANO</small><b>{member.cardPlan?.name||member.planType||"Não informado"} {!isDependent&&member.amountCents!==null?`· ${money(member.amountCents)}`:""}</b></div>
       <div><small>SITUAÇÃO</small><b>{labels[member.status]}</b></div>
       <div><small>CADASTRO NO SISTEMA</small><b>{date(member.joinedAt)}</b></div>
       <div><small>UNIDADE</small><b>{member.unit||"Não informada"}</b></div>
       <div><small>Nº DO CARTÃO</small><b>{member.cardNumber||"Não emitido"}</b></div>
      </div>
      {!isDependent&&!statusOk&&<div className="member-warning">Identificamos uma situação que precisa de acompanhamento. Consulte a aba Mensalidades ou fale com o suporte Quali para regularizar seu cadastro.</div>}
     </section>
     {!isDependent&&<section className="member-panel"><h2>Beneficiários</h2>
      <div className="member-table-wrap"><table><thead><tr><th>NOME</th><th>VÍNCULO</th><th>CPF</th><th>Nº DO CARTÃO</th><th>CONSULTAS NO MÊS</th></tr></thead><tbody>
       <tr><td>{member.name}</td><td>Titular</td><td>Final {member.cpfLast4||"—"}</td><td>{member.cardNumber||"Pendente"}</td><td>{data.consultationsThisMonth}</td></tr>
       {data.dependents.map(item=><tr key={item.id}><td>{item.name}</td><td>Dependente</td><td>Final {item.cpfLast4}</td><td>{item.cardNumber}</td><td>Sem registros</td></tr>)}
      </tbody></table></div>
      <p className="member-muted">{data.dependents.length===0?"Nenhum dependente cadastrado neste cartão.":"Os dependentes estão vinculados ao titular. O uso individual de consultas será conectado aos atendimentos em uma próxima etapa."}</p>
     </section>}
    </div>
   </div>}
   {tab==="benefits"&&<MemberBenefitsTab data={data}/>}
   {tab==="partners"&&<MemberPartnersTab partners={data.partners}/>}
   {tab==="payments"&&<MemberBillingTab data={data}/>}
   {tab==="attendances"&&<MemberAttendancesTab data={data}/>}

  </main>
 </div>;
}
