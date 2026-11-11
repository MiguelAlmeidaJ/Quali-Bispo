"use client";
import {useEffect,useState} from "react";
import {FiArrowLeft,FiCheck,FiCreditCard,FiUser} from "react-icons/fi";
import {
 blankCustomer,centsInput,formatCpf,parseCents,statusLabels,
 type CustomerFormData,type CustomerRecord,type FinanceStatus,
} from "../types/customer";

function toForm(value:CustomerRecord):CustomerFormData{
 return {
  invoice:value.invoice||"",name:value.name,cpf:"",
  birthDate:value.birthDate?.slice(0,10)||"",partnerId:value.partnerId||"",
  planType:value.planType||"",amount:centsInput(value.amountCents),
  paymentMethod:value.paymentMethod||"",status:value.status,
  paymentDetails:value.paymentDetails||"",
 };
}
type PartnerOption={id:string;name:string;city:string;active:boolean};
const returnToClients=()=>{window.location.assign("/admin/?view=clients");};
export function CustomerFormPage({id}:{id?:string}){
 const [form,setForm]=useState<CustomerFormData>({...blankCustomer});
 const [original,setOriginal]=useState<CustomerRecord|null>(null);
 const [partners,setPartners]=useState<PartnerOption[]>([]);
 const [partnersLoading,setPartnersLoading]=useState(true);
 const [partnersError,setPartnersError]=useState("");
 const [loading,setLoading]=useState(!!id),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const editing=!!id;
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/admin/api/partners",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||"Erro ao carregar a Rede Credenciada");return data as PartnerOption[];})
   .then(data=>{if(!controller.signal.aborted)setPartners(data);})
   .catch(e=>{if(!controller.signal.aborted)setPartnersError(e instanceof Error?e.message:"Falha ao buscar unidades");})
   .finally(()=>{if(!controller.signal.aborted)setPartnersLoading(false);});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{
  if(!id)return;
  const controller=new AbortController();
  fetch(`/admin/api/finance/customers/${id}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async response=>{
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||result.error||"Cliente não encontrado");
    return result as CustomerRecord;
   }).then(record=>{if(!controller.signal.aborted){setOriginal(record);setForm(toForm(record));}})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Erro ao carregar cadastro");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[id]);
 function update<K extends keyof CustomerFormData>(key:K,value:CustomerFormData[K]){
  setForm(current=>({...current,[key]:value}));
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();
  setError("");
  const cents=parseCents(form.amount);
  if(Number.isNaN(cents)){setError("Informe um valor de plano válido, como 89,90.");return;}
  if(!form.partnerId&&!editing){setError("Selecione a unidade credenciada do cliente.");return;}
  if(!form.partnerId&&editing&&original?.partnerId){setError("Mantenha ou selecione outra unidade credenciada.");return;}
  if((!editing||form.cpf)&&form.cpf.replace(/\D/g,"").length!==11){
   setError("Informe um CPF com 11 dígitos.");return;
  }
  setSaving(true);
  try{
   const url=editing?`/admin/api/finance/customers/${id}`:"/admin/api/finance/customers";
   const response=await fetch(url,{
    method:editing?"PATCH":"POST",credentials:"same-origin",cache:"no-store",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
     invoice:form.invoice||null,name:form.name.trim(),cpf:form.cpf.replace(/\D/g,"")||null,
     birthDate:form.birthDate||null,partnerId:form.partnerId||null,planType:form.planType||null,
     amountCents:cents,paymentMethod:form.paymentMethod||null,status:form.status,
     paymentDetails:form.paymentDetails||null,
    }),
   });
   const data=await response.json();
   if(!response.ok){
    const message=Array.isArray(data.message)?data.message.join(", "):data.message||data.error;
    throw new Error(message||"Não foi possível salvar o cliente");
   }
   returnToClients();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar");}
  finally{setSaving(false);}
 }
 return <div className="customer-editor">
  <div className="customer-editor-heading">
   <div><button className="customer-back" type="button" onClick={returnToClients}><FiArrowLeft/> Voltar para clientes</button>
    <h1>{editing?"Editar cliente":"Novo cliente"}</h1>
    <p>{editing?"Atualize os dados do cliente com segurança.":"Cadastre um cliente no controle financeiro Quali."}</p>
   </div>
  </div>
  {loading?<div className="panel">Carregando cliente...</div>:
   editing&&!original?<div className="notice error" role="alert">{error||"Cliente não encontrado."}</div>:
   <form className="customer-editor-card" onSubmit={submit}>
    <section>
     <h2><FiUser/> Dados pessoais</h2>
     <div className="customer-editor-grid">
      <label>NF<input maxLength={100} value={form.invoice} placeholder="Número da nota fiscal" onChange={e=>update("invoice",e.target.value)}/></label>
      <label className="wide"><span className="customer-field-title">Nome completo <em>*</em></span><input required minLength={2} maxLength={180} autoComplete="name" value={form.name} onChange={e=>update("name",e.target.value)}/></label>
      <label><span className="customer-field-title">CPF {!editing&&<em>*</em>}</span>
       <input required={!editing} value={form.cpf} maxLength={14} inputMode="numeric"
        autoComplete="off" placeholder="000.000.000-00"
        onChange={e=>update("cpf",formatCpf(e.target.value))}/>
       <small>{editing?original?.cpfLast4?`CPF cadastrado: final ${original.cpfLast4}. Deixe em branco para manter.`:"CPF ainda não confirmado. Informe para cadastrar.":"O CPF será protegido no banco e não poderá ser visualizado integralmente."}</small>
      </label>
      <label>Data de nascimento<input type="date" value={form.birthDate} max={new Date().toISOString().slice(0,10)}
       onChange={e=>update("birthDate",e.target.value)}/></label>
      <label className="wide"><span className="customer-field-title">Unidade credenciada {!editing&&<em>*</em>}</span>
       <select value={form.partnerId} required={!editing||!!original?.partnerId} disabled={partnersLoading||saving} onChange={e=>update("partnerId",e.target.value)}>
        <option value="">{partnersLoading?"Carregando unidades...":"Selecione uma unidade credenciada"}</option>
        {partners.filter(partner=>partner.active||partner.id===original?.partnerId).map(partner=>
         <option key={partner.id} value={partner.id}>{partner.name}{partner.city?` — ${partner.city}`:""}{!partner.active?" (inativa)":""}</option>)}
       </select>
       {partnersError&&<small role="alert" className="customer-field-warning">{partnersError}</small>}
       {editing&&!original?.partnerId&&original?.unit&&<small className="customer-field-warning">Unidade informada na planilha: <strong>{original.unit}</strong>. Selecione a correspondente na Rede Credenciada para criar o vínculo.</small>}
       {editing&&!original?.partnerId&&!original?.unit&&<small>Este cliente ainda não possui vínculo com uma unidade credenciada.</small>}
       {original?.partnerId&&!partners.some(p=>p.id===original.partnerId)&&!partnersLoading&&<small className="customer-field-warning">A unidade vinculada não foi encontrada. Verifique a Rede Credenciada antes de salvar.</small>}
      </label>
     </div>
    </section>
    <section>
     <h2><FiCreditCard/> Plano e pagamento</h2>
     <div className="customer-editor-grid">
      <label>Tipo de cartão<input maxLength={80} value={form.planType} placeholder="Ex.: Individual ou Familiar" onChange={e=>update("planType",e.target.value)}/></label>
      <label>Valor do plano (R$)<input inputMode="decimal" maxLength={16} value={form.amount} placeholder="89,90" onChange={e=>update("amount",e.target.value)}/></label>
      <label>Forma de pagamento<input maxLength={140} value={form.paymentMethod} placeholder="Ex.: Pix, cartão, boleto" onChange={e=>update("paymentMethod",e.target.value)}/></label>
      <label>Status<select value={form.status} onChange={e=>update("status",e.target.value as FinanceStatus)}>
       {(Object.entries(statusLabels) as [FinanceStatus,string][]).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="wide">Detalhes<textarea rows={4} maxLength={2000} value={form.paymentDetails} placeholder="Observações de cobrança ou cadastro" onChange={e=>update("paymentDetails",e.target.value)}/></label>
     </div>
    </section>
    {error&&<p className="notice error" role="alert">{error}</p>}
    <footer className="customer-editor-footer"><button type="button" className="customer-cancel" onClick={returnToClients} disabled={saving}>Cancelar</button>
     <button type="submit" className="customer-submit" disabled={saving}><FiCheck/>{saving?"Salvando...":editing?"Salvar alterações":"Cadastrar cliente"}</button>
    </footer>
   </form>}
 </div>;
}
