"use client";
import {useEffect,useState} from "react";
import {FiCalendar,FiClipboard,FiCreditCard,FiPlus,FiTrash2,FiSettings} from "react-icons/fi";
import {CatalogPage} from "./CatalogPage";
import {CardsPage} from "./CardsPage";

type Tab="due-days"|"pricing"|"cards";
const valid=(n:number)=>Number.isInteger(n)&&n>=1&&n<=31;
export function BillingSettingsPage(){
 const [tab,setTab]=useState<Tab>("due-days");
 const [days,setDays]=useState<number[]>([]);
 const [nextDay,setNextDay]=useState("");
 const [busy,setBusy]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 useEffect(()=>{
  let mounted=true;
  fetch("/admin/api/billing-settings/due-days",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.message||data.error||"Erro ao carregar vencimentos");
   if(mounted)setDays(data.days as number[]);
  }).catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Falha na consulta");})
   .finally(()=>{if(mounted)setBusy(false)});
  return()=>{mounted=false};
 },[]);
 const sorted=[...days].sort((a,b)=>a-b);
 function addDay(){
  setError("");setSuccess("");
  const value=Number(nextDay);
  if(!nextDay.trim()||!valid(value)){setError("Informe um dia inteiro entre 1 e 31.");return;}
  if(days.includes(value)){setError("Este dia já foi cadastrado. Não é permitido repetir números.");return;}
  setDays(existing=>[...existing,value].sort((a,b)=>a-b));
  setNextDay("");
 }
 async function save(){
  setError("");setSuccess("");
  if(!days.length){setError("Mantenha pelo menos um dia de vencimento.");return;}
  setSaving(true);
  try{
   const response=await fetch("/admin/api/billing-settings/due-days",{
    method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({days:sorted})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.message||data.error||"Falha ao salvar vencimentos");
   setDays(data.days as number[]);setSuccess("Dias de vencimento atualizados com sucesso.");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar vencimentos");}
  finally{setSaving(false);}
 }
 return <div className="billing-settings-page">
  <header className="page-title"><div><span className="billing-settings-eyebrow"><FiSettings/> ADMINISTRAÇÃO</span>
   <h1>Configurações</h1><p>Gerencie os vencimentos, a tabela de valores e os cartões do Quali Bispo.</p></div></header>
  <nav className="billing-settings-tabs" aria-label="Abas das configurações">
   {([{id:"due-days",label:"Dias de vencimento",Icon:FiCalendar},{id:"pricing",label:"Tabela de valores",Icon:FiClipboard},{id:"cards",label:"Cartões",Icon:FiCreditCard}] as const).map(item=>
    <button type="button" key={item.id} className={tab===item.id?"active":""} aria-current={tab===item.id?"page":undefined}
     onClick={()=>{setTab(item.id);setError("");setSuccess("");}}><item.Icon size={18}/>{item.label}</button>)}
  </nav>
  {tab==="due-days"&&<section className="billing-days-panel">
   <div className="billing-days-heading"><div><h2>Dias de vencimento disponíveis</h2>
    <p>Cadastre os dias que aparecerão no campo de vencimento do cliente. Cada número representa somente um dia do mês, não uma data completa.</p></div>
    <span>{days.length} de 31 dias</span></div>
   {busy?<p className="muted">Carregando dias cadastrados...</p>:<>
    <form className="billing-days-form" onSubmit={event=>{event.preventDefault();addDay();}}>
     <label htmlFor="billing-new-day">Novo dia</label>
     <input id="billing-new-day" type="number" min={1} max={31} step={1} placeholder="Ex.: 10"
      value={nextDay} onChange={e=>setNextDay(e.target.value)}/>
     <button type="submit" disabled={saving}><FiPlus/> Adicionar dia</button>
    </form>
    <div className="billing-days-grid" aria-label="Dias cadastrados">
     {sorted.map(day=><div key={day} className="billing-day-chip"><strong>Dia {day}</strong>
      <button type="button" aria-label={`Remover dia ${day}`} title={`Remover dia ${day}`} disabled={saving}
       onClick={()=>{setDays(current=>current.filter(value=>value!==day));setSuccess("");}}><FiTrash2 size={16}/></button></div>)}
     {!days.length&&<p className="muted">Nenhum dia selecionado. Adicione pelo menos um.</p>}
    </div>
    <p className="billing-days-note">Dias 29, 30 e 31 podem não existir em todos os meses. A futura rotina de cobranças deverá usar o último dia do mês nesses casos. Essa tela ainda não gera cobranças.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}
    {success&&<p className="notice success" role="status">{success}</p>}
    <div className="billing-days-footer"><button type="button" className="customer-submit" disabled={saving||!days.length} onClick={()=>void save()}>{saving?"Salvando...":"Salvar dias de vencimento"}</button></div>
   </>}
  </section>}
  {tab==="pricing"&&<CatalogPage/>}
  {tab==="cards"&&<CardsPage/>}
 </div>;
}
