"use client";
import {useEffect,useState} from "react";
import {FiArrowLeft,FiCheck,FiCreditCard,FiPlus,FiUser} from "react-icons/fi";
import {blankCustomer,centsInput,formatCpf,parseCents,statusLabels,type CustomerFormData,
 type CustomerRecord,type FinanceStatus} from "../types/customer";
import type {CardPlan} from "./CardsPage";

type PartnerOption={id:string;name:string;city:string;active:boolean};
type DependentForm={id?:string;name:string;cpf:string;birthDate:string;cardNumber?:string;cpfLast4?:string};
const emptyDependent=():DependentForm=>({name:"",cpf:"",birthDate:""});
const returnToClients=()=>window.location.assign("/admin/?view=clients");
const planPrice=(value:number)=>centsInput(value);
function fromRecord(value:CustomerRecord):CustomerFormData{
 return {invoice:value.invoice||"",name:value.name,cpf:"",
  birthDate:value.birthDate?.slice(0,10)||"",partnerId:value.partnerId||"",
  cardPlanId:value.cardPlanId||"",planType:value.planType||"",
  amount:centsInput(value.amountCents),paymentMethod:value.paymentMethod||"",
  status:value.status,paymentDetails:value.paymentDetails||""};
}
export function CustomerFormPage({id}:{id?:string}){
 const editing=!!id;
 const [form,setForm]=useState<CustomerFormData>({...blankCustomer});
 const [original,setOriginal]=useState<CustomerRecord|null>(null);
 const [plans,setPlans]=useState<CardPlan[]>([]);
 const [partners,setPartners]=useState<PartnerOption[]>([]);
 const [dependents,setDependents]=useState<DependentForm[]>([]);
 const [loading,setLoading]=useState(editing),[loadingOptions,setLoadingOptions]=useState(true);
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const [cpfChecks,setCpfChecks]=useState<Record<string,string>>({});
 const [changingBenefit,setChangingBenefit]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  Promise.all([
   fetch("/admin/api/partners",{cache:"no-store",signal:controller.signal}),
   fetch("/admin/api/card-plans",{cache:"no-store",signal:controller.signal}),
  ]).then(async ([pr,pl])=>{
   const [partnerData,planData]=await Promise.all([pr.json(),pl.json()]);
   if(!pr.ok||!pl.ok)throw new Error(partnerData.message||planData.message||partnerData.error||planData.error||"Falha ao carregar opções.");
   if(!controller.signal.aborted){setPartners(partnerData);setPlans(planData);}
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Falha ao carregar opções");})
   .finally(()=>{if(!controller.signal.aborted)setLoadingOptions(false)});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{
  if(!id)return;
  const controller=new AbortController();
  fetch(`/admin/api/finance/customers/${id}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||"Cliente não encontrado");return data as CustomerRecord;})
   .then(record=>{if(!controller.signal.aborted){
    setOriginal(record);setForm(fromRecord(record));
    setDependents((record.dependents||[]).map(d=>({id:d.id,name:d.name,cpf:"",birthDate:d.birthDate.slice(0,10),
     cardNumber:d.cardNumber,cpfLast4:d.cpfLast4})));
   }}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Falha ao carregar cliente");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[id]);
 const selected=plans.find(item=>item.id===form.cardPlanId)||
  (original?.cardPlan&&original.cardPlan.id===form.cardPlanId?{...original.cardPlan,_count:{customers:0}}:null);
 const maximum=selected?.maxDependents||0;
 function update<K extends keyof CustomerFormData>(key:K,value:CustomerFormData[K]){
  setForm(current=>({...current,[key]:value}));
 }
 function changePlan(id:string){
  const plan=plans.find(item=>item.id===id);
  setForm(current=>({...current,cardPlanId:id,planType:plan?.name||current.planType,
   amount:plan?planPrice(plan.priceCents):current.amount}));
 }
 async function checkCpf(cpf:string,key:string){
  const digits=cpf.replace(/\D/g,"");
  if(digits.length!==11)return;
  try{
   const r=await fetch(`/admin/api/customer-benefits/check-cpf?cpf=${digits}`,{cache:"no-store"});
   const result=await r.json();
   setCpfChecks(old=>({...old,[key]:r.ok?result.reason:result.message||result.error||"Não foi possível validar o CPF"}));
  }catch{setCpfChecks(old=>({...old,[key]:"Verificação indisponível. A validação será repetida ao salvar."}));}
 }
 async function changeBenefit(){
  if(!original||!id)return;
  const next=!original.benefitActive;
  const reason=window.prompt(next?"Informe o motivo para reativar os benefícios da família:":"Informe o motivo do cancelamento (titular e dependentes):");
  if(reason===null)return;
  if(reason.trim().length<8){setError("Informe um motivo de pelo menos 8 caracteres.");return;}
  if(!window.confirm(next?"Confirma reativar os benefícios da família?":"Confirma cancelar o acesso de toda a família, preservando os cadastros?"))return;
  setChangingBenefit(true);setError("");
  try{
   const r=await fetch(`/admin/api/customer-benefits/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},
    body:JSON.stringify({active:next,reason})});
   const response=await r.json();
   if(!r.ok)throw new Error(response.message||response.error||"Falha ao alterar benefício");
   setOriginal(old=>old?{...old,benefitActive:next,
    benefitCancelledAt:next?null:new Date().toISOString(),benefitCancelReason:next?null:reason}:old);
  }catch(e){setError(e instanceof Error?e.message:"Falha na atualização");}
  finally{setChangingBenefit(false);}
 }
 function updateDependent(index:number,key:keyof DependentForm,value:string){
  setDependents(current=>current.map((item,i)=>i===index?{...item,[key]:value}:item));
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();setError("");
  if(!editing&&!form.cardPlanId){setError("Selecione um tipo de cartão.");return;}
  if(!form.partnerId&&!editing){setError("Selecione a unidade credenciada do cliente.");return;}
  if(!form.partnerId&&editing&&original?.partnerId){setError("Mantenha uma unidade credenciada.");return;}
  if(!form.birthDate&&!editing){setError("Informe o nascimento do titular para emitir a carteirinha.");return;}
  if((!editing||form.cpf)&&form.cpf.replace(/\D/g,"").length!==11){
   setError("Informe um CPF com 11 dígitos.");return;
  }
  if(dependents.length>maximum){setError(`O cartão selecionado permite até ${maximum} dependente(s).`);return;}
  for(const item of dependents){
   if(item.name.trim().length<2||!item.birthDate||(!item.id&&item.cpf.replace(/\D/g,"").length!==11)){
    setError("Preencha nome, CPF e nascimento de cada novo dependente.");return;
   }
  }
  setSaving(true);
  try{
   const body={
    invoice:form.invoice||null,name:form.name.trim(),cpf:form.cpf.replace(/\D/g,"")||null,
    birthDate:form.birthDate||null,partnerId:form.partnerId||null,
    cardPlanId:form.cardPlanId||null,
    planType:form.planType||null,amountCents:selected?selected.priceCents:parseCents(form.amount),
    paymentMethod:form.paymentMethod||null,status:form.status,
    paymentDetails:form.paymentDetails||null,
    ...(selected?{dependents:dependents.map(item=>({
     ...(item.id?{id:item.id}:{}),name:item.name.trim(),
     ...(item.cpf?{cpf:item.cpf.replace(/\D/g,"")}:{}),birthDate:item.birthDate,
    }))}:{}),
   };
   const r=await fetch(editing?`/admin/api/finance/customers/${id}`:"/admin/api/finance/customers",{
    method:editing?"PATCH":"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
    body:JSON.stringify(body)});
   const data=await r.json();
   if(!r.ok)throw new Error(Array.isArray(data.message)?data.message.join(", "):data.message||data.error||"Não foi possível salvar.");
   returnToClients();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");}
  finally{setSaving(false);}
 }
 return <div className="customer-editor">
  <div className="customer-editor-heading"><button className="customer-back" onClick={returnToClients}><FiArrowLeft/> Voltar para clientes</button>
   <h1>{editing?"Editar cliente":"Novo cliente"}</h1>
   <p>Dados pessoais, cartão, benefícios e familiares.</p></div>
  {loading?<div className="panel">Carregando cadastro...</div>:editing&&!original?
   <p className="notice error" role="alert">{error||"Cliente não encontrado."}</p>:
   <form className="customer-editor-card" onSubmit={submit}>
    <section><h2><FiUser/> Dados pessoais</h2><div className="customer-editor-grid">
     <label>NF<input value={form.invoice} maxLength={100} placeholder="Número da nota fiscal" onChange={e=>update("invoice",e.target.value)}/></label>
     <label className="wide"><span className="customer-field-title">Nome completo <em>*</em></span>
      <input required minLength={2} maxLength={180} value={form.name} onChange={e=>update("name",e.target.value)}/></label>
     <label><span className="customer-field-title">CPF {!editing&&<em>*</em>}</span>
      <input required={!editing} disabled={!!original?.cardNumber} maxLength={14} inputMode="numeric" autoComplete="off"
       onBlur={()=>{if(form.cpf)void checkCpf(form.cpf,"holder");}} value={form.cpf} placeholder="000.000.000-00" onChange={e=>{update("cpf",formatCpf(e.target.value));setCpfChecks(v=>({...v,holder:""}));}}/>
      {cpfChecks.holder&&<small className={cpfChecks.holder.includes("já possui")?"customer-cpf-blocked":"customer-cpf-checked"}>{cpfChecks.holder}</small>}
      <small>{original?.cpfLast4?`CPF cadastrado: final ${original.cpfLast4}. Deixe vazio para manter. Após emissão, CPF/nascimento exigem reemissão administrativa.`:"O CPF é protegido no banco."}</small></label>
     <label><span className="customer-field-title">Data de nascimento {!editing&&<em>*</em>}</span>
      <input type="date" required={!editing} disabled={!!original?.cardNumber} value={form.birthDate}
       max={new Date().toISOString().slice(0,10)} onChange={e=>update("birthDate",e.target.value)}/></label>
     {original?.cardNumber&&<label>Número do cartão do titular<input readOnly value={original.cardNumber.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3")}/>
      <small>Gerado pelo sistema. Não pode ser alterado.</small></label>}
     <label className="wide"><span className="customer-field-title">Unidade credenciada {!editing&&<em>*</em>}</span>
      <select value={form.partnerId} required={!editing||!!original?.partnerId} disabled={loadingOptions||saving}
       onChange={e=>update("partnerId",e.target.value)}>
       <option value="">{loadingOptions?"Carregando unidades...":"Selecione uma unidade"}</option>
       {partners.filter(p=>p.active||p.id===original?.partnerId).map(p=>
        <option value={p.id} key={p.id}>{p.name}{p.city?` — ${p.city}`:""}</option>)}
      </select>
      {editing&&!original?.partnerId&&original?.unit&&<small>Unidade importada: {original.unit}. Selecione a correspondente para vinculá-la.</small>}</label>
    </div></section>
    <section><h2><FiCreditCard/> Plano e pagamento</h2><div className="customer-editor-grid">
     <label><span className="customer-field-title">Tipo de cartão {!editing&&<em>*</em>}</span>
      <select required={!editing} disabled={loadingOptions} value={form.cardPlanId} onChange={e=>changePlan(e.target.value)}>
       <option value="">Selecione um cartão</option>{plans.filter(p=>p.active||p.id===original?.cardPlanId).map(p=>
        <option value={p.id} key={p.id}>{p.name} — {p.maxDependents?"Familiar":"Individual"}</option>)}
      </select>
      {!selected&&original?.planType&&<small>Plano histórico da planilha: {original.planType}. Selecione um cartão cadastrado para migrar o cliente.</small>}
     </label>
     <label>Forma de pagamento<input maxLength={140} value={form.paymentMethod} placeholder="Pix, cartão ou boleto"
      onChange={e=>update("paymentMethod",e.target.value)}/></label>
     <label>Status<select value={form.status} onChange={e=>update("status",e.target.value as FinanceStatus)}>
      {(Object.entries(statusLabels) as [FinanceStatus,string][]).map(([key,label])=>
       <option key={key} value={key}>{label}</option>)}</select></label>
     <label className="wide">Detalhes<textarea rows={4} maxLength={2000} value={form.paymentDetails}
      onChange={e=>update("paymentDetails",e.target.value)}/></label>
    </div></section>
    {(maximum>0||dependents.length>0)&&<section className="customer-dependents">
     <h2><FiUsersIcon/> Dependentes ({dependents.length} de {maximum})</h2>
     <p>Plano Familiar: até três dependentes. Cada pessoa recebe um número exclusivo após o cadastro.</p>
     {dependents.map((item,index)=><div className="customer-dependent-row" key={item.id||`new-${index}`}>
      <label>Nome do dependente <input required maxLength={180} value={item.name} placeholder={`Dependente ${index+1}`}
       onChange={e=>updateDependent(index,"name",e.target.value)}/></label>
      <label>CPF <input required={!item.id} disabled={!!item.cardNumber} value={item.cpf} inputMode="numeric" maxLength={14}
       onBlur={()=>{if(!item.id)void checkCpf(item.cpf,`dependent-${index}`);}}
       placeholder={item.id?`Cadastrado: final ${item.cpfLast4}`:"000.000.000-00"}
       onChange={e=>{updateDependent(index,"cpf",formatCpf(e.target.value));setCpfChecks(v=>({...v,[`dependent-${index}`]:""}));}}/>
       {cpfChecks[`dependent-${index}`]&&<small className={cpfChecks[`dependent-${index}`].includes("já possui")?"customer-cpf-blocked":"customer-cpf-checked"}>{cpfChecks[`dependent-${index}`]}</small>}</label>
      <label>Nascimento <input required type="date" disabled={!!item.cardNumber} max={new Date().toISOString().slice(0,10)}
       value={item.birthDate} onChange={e=>updateDependent(index,"birthDate",e.target.value)}/></label>
      {!item.id&&<button type="button" className="customer-cancel" onClick={()=>setDependents(current=>current.filter((_,i)=>i!==index))}>Remover novo dependente</button>}
      {item.cardNumber&&<small>Cartão: {item.cardNumber.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3")}</small>}
     </div>)}
     {dependents.length<maximum&&<button type="button" className="customer-add-dependent" onClick={()=>setDependents(prev=>[...prev,emptyDependent()])}>
      <FiPlus/> Adicionar dependente</button>}
     <small>Dependentes existentes não são excluídos ao mudar o cartão. A exclusão exigirá procedimento específico para preservar o histórico.</small>
    </section>}
    {editing&&original&&<section className="customer-benefit-management">
     <div><h2>Benefício da família</h2>
      <p><strong className={original.benefitActive?"benefit-enabled":"benefit-disabled"}>
       {original.benefitActive?"Benefício ativo":"Benefício cancelado"}</strong>
       {original.benefitCancelReason&&!original.benefitActive?` · Motivo: ${original.benefitCancelReason}`:""}</p>
      <small>Cancelamento não apaga os dados nem os cartões de titular ou dependentes. Acesso e atendimentos serão bloqueados.</small></div>
     <button type="button" disabled={changingBenefit||saving} className={original.benefitActive?"customer-benefit-cancel":"customer-benefit-restore"}
      onClick={()=>void changeBenefit()}>{changingBenefit?"Atualizando...":original.benefitActive?"Cancelar benefício da família":"Reativar benefício da família"}</button>
    </section>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <footer className="customer-editor-footer"><button type="button" className="customer-cancel" onClick={returnToClients} disabled={saving}>Cancelar</button>
     <button type="submit" className="customer-submit" disabled={saving||loadingOptions||Object.values(cpfChecks).some(value=>value.includes("já possui"))}><FiCheck/> {saving?"Salvando...":editing?"Salvar alterações":"Cadastrar cliente"}</button></footer>
   </form>}
 </div>;
}
function FiUsersIcon(){return <FiUser size={18}/>;}
