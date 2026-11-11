"use client";
import { useState } from "react";
import { Brand } from "./Brand";
import type { User } from "../types/admin";
export function Login({onLogin}:{onLogin:(u:User)=>void}){
 const[username,setUsername]=useState("");const[password,setPassword]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const res=await fetch("/admin/api/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password})});const body=await res.json();if(!res.ok)throw new Error(body.error||"Não foi possível autenticar");onLogin(body.user);}catch(err){setError(err instanceof Error?err.message:"Erro ao entrar");}finally{setBusy(false);}}
 return <div className="login-page">
 <aside className="login-banner"><Brand light/><div className="login-banner-center"><h1>Painel de gestão do<br/>Clube Quali Benefícios</h1><ul><li>Validação de CPF em tempo real</li><li>Controle do limite de consultas</li><li>Clientes, inadimplência e atendimentos</li><li>Carteirinhas e relatórios</li></ul></div><p className="support">Acesso restrito à equipe Quali e aos parceiros credenciados.<br/>Suporte comercial: <a href="https://wa.me/553299388743" target="_blank" rel="noreferrer">WhatsApp Amanda · (32) 9938-8743</a></p></aside>
 <main className="login-right"><div className="login-form"><Brand/><h2>Entrar no painel</h2><p>Use o usuário e a senha fornecidos pela Quali.</p><form onSubmit={submit}><label htmlFor="username">Usuário</label><input id="username" autoComplete="username" placeholder="usuário" required value={username} onChange={e=>setUsername(e.target.value)}/><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary" disabled={busy}>{busy?"Entrando...":"Entrar"}</button>{error&&<div className="notice error" role="alert">{error}</div>}</form><a href="/">← Voltar ao site do cliente</a></div></main>
 </div>;
}
