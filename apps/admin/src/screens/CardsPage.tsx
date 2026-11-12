"use client";
import {useCallback,useEffect,useState} from "react";
import {FiCreditCard,FiEdit2,FiPlus,FiCheck,FiX} from "react-icons/fi";
export type CardPlan={id:string;name:string;priceCents:number;maxDependents:number;benefits:string[];active:boolean;_count:{customers:number}};
const formatMoney=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
const toCents=(value:string)=>{const normalized=value.trim().replace(/\./g,"").replace(",",".");return /^\d+(\.\d{1,2})?$/.test(normalized)?Math.round(Number(normalized)*100):NaN};
type Form={name:string;price:string;maxDependents:number;benefits:string;active:boolean};
const empty:Form={name:"",price:"",maxDependents:0,benefits:"",active:true};
export function CardsPage(){
 const [plans,setPlans]=useState<CardPlan[]>([]),[busy,setBusy]=useState(true),[saving,setSaving]=useState(false);
 const [current,setCurrent]=useState<CardPlan|null>(null),[editing,setEditing]=useState(false);
 const [form,setForm]=useState<Form>({...empty}),[error,setError]=useState("");
 const refresh=useCallback(async()=>{
  setBusy(true);try{
   const response=await fetch("/admin/api/card-plans",{cache:"no-store"});
   const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||"Erro ao carregar cartões");
   setPlans(data as CardPlan[]);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao consultar cartões");}
  finally{setBusy(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 function open(plan?:CardPlan){
  setCurrent(plan||null);setForm(plan?{name:plan.name,price:(plan.priceCents/100).toFixed(2).replace(".",","),
   maxDependents:plan.maxDependents,benefits:plan.benefits.join("\n"),active:plan.active}:{...empty});
  setEditing(true);setError("");
 }
 async function save(e:React.FormEvent){
  e.preventDefault();const cents=toCents(form.price);
  if(!Number.isSafeInteger(cents)||cents<0){setError("Informe um preço válido, como 89,90.");return;}
  setSaving(true);setError("");
  try{
   const r=await fetch(current?`/admin/api/card-plans/${current.id}`:"/admin/api/card-plans",{
    method:current?"PATCH":"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({name:form.name,priceCents:cents,maxDependents:form.maxDependents,
     benefits:form.benefits.split("\n").map(s=>s.trim()).filter(Boolean),active:form.active}),
   });
   const data=await r.json();
   if(!r.ok)throw new Error(data.message||data.error||"Falha ao salvar");
   setEditing(false);await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar");}
  finally{setSaving(false);}
 }
 return <div className="cards-admin">
  <header className="page-title cards-page-heading"><div><h1>Cartões</h1><p>Configure preços, benefícios e composição dos planos.</p></div>
   <button className="customer-new-link" onClick={()=>open()}><FiPlus/> Novo cartão</button></header>
  {error&&!editing&&<p className="notice error" role="alert">{error}</p>}
  {busy?<p className="panel">Carregando cartões...</p>:<div className="cards-plan-grid">
   {plans.map(plan=><article className="cards-plan-card" key={plan.id}>
    <div className="cards-plan-header"><span className="cards-plan-symbol"><FiCreditCard size={23}/></span>
     <span className={plan.active?"cards-active":"cards-inactive"}>{plan.active?"Ativo":"Inativo"}</span></div>
    <h2>{plan.name}</h2><strong className="cards-plan-price">{formatMoney(plan.priceCents)} <small>/mês</small></strong>
    <p>{plan.maxDependents===0?"Plano individual":`Plano familiar · até ${plan.maxDependents} dependentes`}</p>
    <ul>{plan.benefits.map(benefit=><li key={benefit}><FiCheck size={15}/>{benefit}</li>)}</ul>
    <footer><span>{plan._count.customers} cliente(s)</span>
     <button type="button" className="customer-edit-link" onClick={()=>open(plan)}><FiEdit2/> Editar</button></footer>
   </article>)}
   {!plans.length&&<p className="panel">Nenhum cartão cadastrado. Use “Novo cartão” para criar Individual e Familiar com os valores e benefícios oficiais.</p>}
  </div>}
  {editing&&<div className="cards-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditing(false)}}>
   <section className="cards-modal" role="dialog" aria-modal="true" aria-labelledby="cards-modal-title">
    <header><div><h2 id="cards-modal-title">{current?"Editar cartão":"Novo cartão"}</h2>
     <p>As configurações serão usadas nos novos cadastros de clientes.</p></div>
     <button type="button" aria-label="Fechar" disabled={saving} onClick={()=>setEditing(false)}><FiX/></button></header>
    <form onSubmit={save}>
     <label>Nome do cartão <em>*</em><input required maxLength={80} value={form.name}
      placeholder="Individual ou Familiar" onChange={e=>setForm({...form,name:e.target.value})}/></label>
     <div className="cards-form-grid"><label>Mensalidade (R$) <em>*</em><input required
      inputMode="decimal" placeholder="89,90" value={form.price}
      onChange={e=>setForm({...form,price:e.target.value})}/></label>
      <label>Composição do cartão<select value={form.maxDependents} onChange={e=>setForm({...form,maxDependents:Number(e.target.value)})}>
       <option value={0}>Individual — somente titular</option>
       <option value={3}>Familiar — até 3 dependentes</option></select></label></div>
     <label>Benefícios <small>(um por linha)</small><textarea rows={5} maxLength={6000}
      placeholder="Consultas médicas com desconto&#10;Exames e check-ups&#10;Rede credenciada"
      value={form.benefits} onChange={e=>setForm({...form,benefits:e.target.value})}/></label>
     <label className="cards-check"><input type="checkbox" checked={form.active}
      onChange={e=>setForm({...form,active:e.target.checked})}/> Cartão ativo para novos clientes</label>
     {error&&<p className="notice error" role="alert">{error}</p>}
     <footer><button type="button" className="customer-cancel" disabled={saving} onClick={()=>setEditing(false)}>Cancelar</button>
      <button type="submit" className="customer-submit" disabled={saving}>{saving?"Salvando...":"Salvar cartão"}</button></footer>
    </form>
   </section>
  </div>}
 </div>;
}
