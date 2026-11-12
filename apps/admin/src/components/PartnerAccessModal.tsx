"use client";
import {useEffect,useState} from "react";
import {FiKey,FiX,FiShield} from "react-icons/fi";
import type {Partner} from "../types/partner";
type Account={id:string;name:string;username:string|null;email:string;active:boolean};
type AccessResponse={partner:{id:string;name:string;active:boolean};accounts:Account[]};
export function PartnerAccessModal({partner,onClose}:{partner:Partner;onClose:()=>void}){
 const [data,setData]=useState<AccessResponse|null>(null);
 const [form,setForm]=useState({name:"",username:"",email:"",password:"",active:true});
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/admin/api/partners/${partner.id}/access`,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async r=>{const result=await r.json();if(!r.ok)throw new Error(result.message||result.error||"Falha ao consultar acesso");return result as AccessResponse;})
   .then(result=>{
    if(controller.signal.aborted)return;
    setData(result);
    const account=result.accounts[0];
    if(account)setForm({name:account.name,username:account.username||"",email:account.email,password:"",active:account.active});
    else setForm({name:partner.name,username:"",email:"",password:"",active:partner.active});
   }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Falha ao carregar acesso");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[partner.id,partner.name,partner.active]);
 useEffect(()=>{
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  function key(e:KeyboardEvent){if(e.key==="Escape"&&!saving)onClose();}
  window.addEventListener("keydown",key);
  return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",key);};
 },[saving,onClose]);
 async function save(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError("");setSuccess("");
  try{
   const r=await fetch(`/admin/api/partners/${partner.id}/access`,{
    method:"PUT",credentials:"same-origin",headers:{"content-type":"application/json"},
    body:JSON.stringify(form)});
   const result=await r.json();
   if(!r.ok)throw new Error(Array.isArray(result.message)?result.message.join(", "):result.message||result.error||"Falha ao salvar");
   const account=result as Account;
   setData(current=>current?{...current,accounts:[account]}:null);
   setForm(current=>({...current,password:""}));
   setSuccess("Acesso salvo. Compartilhe usuário e senha por um canal seguro; a senha não poderá ser consultada novamente.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar o acesso");}
  finally{setSaving(false);}
 }
 const existing=!!data?.accounts.length;
 return <div className="partner-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose();}}>
  <section className="partner-access-dialog" role="dialog" aria-modal="true" aria-labelledby="partner-access-heading">
   <header className="partner-access-heading"><div><span className="partner-eyebrow">REDE CREDENCIADA</span>
    <h2 id="partner-access-heading"><FiKey/> Acesso do parceiro</h2>
    <p>{partner.name}</p></div>
    <button type="button" aria-label="Fechar" disabled={saving} onClick={onClose}><FiX size={20}/></button>
   </header>
   {loading?<p className="partner-access-loading">Carregando credenciais...</p>:
    data?.accounts.length&&data.accounts.length>1?<p className="notice error">Mais de um usuário está vinculado a esta unidade. Solicite regularização à administração.</p>:
    <form className="partner-access-form" onSubmit={save}>
     <p className="partner-access-info"><FiShield/> Cada unidade tem seu próprio login para Validar CPF, Atendimentos e consultar a Tabela de Valores.</p>
     <label>Nome do responsável <input required minLength={3} maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
     <label>Usuário <input required minLength={3} maxLength={40} autoComplete="off" placeholder="ex.: unidade.mutua"
      value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase()})}/></label>
     <label>E-mail para identificação <input required type="email" maxLength={180} autoComplete="off"
      value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
     <label>{existing?"Nova senha (opcional)":"Senha inicial"} <input
      required={!existing} type="password" minLength={12} maxLength={128} autoComplete="new-password"
      placeholder={existing?"Deixe vazio para manter a senha atual":"Mínimo de 12 caracteres"}
      value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      <small>{existing?"Preencha apenas se quiser redefinir a senha.":"Use uma senha exclusiva para esta unidade."}</small></label>
     <label className="partner-access-check"><input type="checkbox" checked={form.active} disabled={!partner.active}
      onChange={e=>setForm({...form,active:e.target.checked})}/> Habilitar login desta unidade</label>
     {!partner.active&&<p className="notice error">A unidade está inativa. Ative-a antes de habilitar o login.</p>}
     {error&&<p className="notice error" role="alert">{error}</p>}
     {success&&<p className="notice success" role="status">{success}</p>}
     <footer><button type="button" disabled={saving} onClick={onClose}>Fechar</button>
      <button type="submit" className="partner-primary-btn" disabled={saving||(!partner.active&&form.active)}>{saving?"Salvando...":existing?"Salvar acesso":"Criar login"}</button></footer>
    </form>}
   {loading&&error&&<p className="notice error" role="alert">{error}</p>}
  </section>
 </div>;
}
