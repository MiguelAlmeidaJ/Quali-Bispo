"use client";
import {useEffect,useState} from "react";
import {devApi} from "../../lib/devApi";
type Settings={appName:string;primaryColor:string;secondaryColor:string;logoUrl:string;faviconUrl:string};
const initial:Settings={appName:"Quali Benefícios",primaryColor:"#0c66aa",secondaryColor:"#21834a",logoUrl:"",faviconUrl:""};
export function SettingsPage(){
 const[form,setForm]=useState<Settings>(initial),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const[error,setError]=useState(""),[success,setSuccess]=useState("");
 useEffect(()=>{devApi<Settings>("settings").then(setForm).catch(e=>setError((e as Error).message)).finally(()=>setLoading(false))},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError("");setSuccess("");
  try{setForm(await devApi<Settings>("settings","PUT",form));setSuccess("Configurações salvas no PostgreSQL.");}
  catch(e){setError((e as Error).message)}finally{setSaving(false)}
 }
 if(loading)return <p>Carregando configurações...</p>;
 return <div className="dev-page"><header className="page-title"><div><h1>Configurações do sistema</h1><p>Identidade visual · acesso exclusivo DEV</p></div></header>
 <section className="panel"><h2>Identidade visual</h2>
 <p className="muted">As preferências são armazenadas no banco. A aplicação dinâmica do tema e o upload de arquivos serão integrados em uma próxima etapa.</p>
 <form className="dev-form" onSubmit={submit}>
 <label>Nome exibido<input value={form.appName} maxLength={80} required onChange={e=>setForm({...form,appName:e.target.value})}/></label>
 <label>Cor principal<div className="dev-color"><input type="color" value={form.primaryColor} onChange={e=>setForm({...form,primaryColor:e.target.value})}/><input value={form.primaryColor} pattern="#[0-9a-fA-F]{6}" onChange={e=>setForm({...form,primaryColor:e.target.value})}/></div></label>
 <label>Cor secundária<div className="dev-color"><input type="color" value={form.secondaryColor} onChange={e=>setForm({...form,secondaryColor:e.target.value})}/><input value={form.secondaryColor} pattern="#[0-9a-fA-F]{6}" onChange={e=>setForm({...form,secondaryColor:e.target.value})}/></div></label>
 <label>URL do logotipo<input placeholder="/logo.png ou https://..." value={form.logoUrl} maxLength={500} onChange={e=>setForm({...form,logoUrl:e.target.value})}/></label>
 <label>URL do favicon<input placeholder="/favicon.ico ou https://..." value={form.faviconUrl} maxLength={500} onChange={e=>setForm({...form,faviconUrl:e.target.value})}/></label>
 <div className="dev-actions"><button className="primary" disabled={saving}>{saving?"Salvando...":"Salvar configurações"}</button></div></form>
 {error&&<p className="notice error" role="alert">{error}</p>}
 {success&&<p className="notice success" role="status">{success}</p>}
 </section>
 <section className="panel gap-panel"><h2>Prévia das cores</h2><div className="brand-preview"><span style={{backgroundColor:form.primaryColor}}>Principal</span><span style={{backgroundColor:form.secondaryColor}}>Secundária</span></div></section>
 </div>;
}
