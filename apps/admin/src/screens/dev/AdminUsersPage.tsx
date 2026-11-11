"use client";
import {useEffect,useState} from "react";
import {devApi} from "../../lib/devApi";
type Admin={id:string;username:string;name:string;email:string;active:boolean;createdAt:string};
export function AdminUsersPage(){
 const[items,setItems]=useState<Admin[]>([]);
 const[error,setError]=useState("");
 const[success,setSuccess]=useState("");
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[form,setForm]=useState({username:"",name:"",email:"",password:""});
 async function refresh(){
  try{setItems(await devApi<Admin[]>("administrators"))}catch(e){setError((e as Error).message)}finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError("");setSuccess("");
  try{
   const created=await devApi<Admin>("administrators","POST",form);
   setItems(current=>[created,...current]);setForm({username:"",name:"",email:"",password:""});
   setSuccess("Administrador criado com sucesso.");
  }catch(e){setError((e as Error).message)}finally{setSaving(false)}
 }
 return <div className="dev-page">
 <header className="page-title"><div><h1>Administradores</h1><p>Criação de contas administrativas · acesso exclusivo DEV</p></div></header>
 <section className="panel"><h2>Novo administrador</h2>
 <form className="dev-form" onSubmit={submit}>
  <label>Nome completo<input required minLength={3} maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
  <label>Usuário<input required minLength={3} maxLength={40} autoComplete="off" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></label>
  <label>E-mail<input required type="email" maxLength={180} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
  <label>Senha inicial<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
  <div className="dev-actions"><button className="primary" disabled={saving}>{saving?"Salvando...":"Criar administrador"}</button><span className="muted">Senha mínima: 12 caracteres. Não é exibida nem armazenada em texto.</span></div>
 </form>
 {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice success" role="status">{success}</p>}
 </section>
 <section className="panel gap-panel"><h2>Administradores cadastrados</h2>
 {loading?<p>Carregando...</p>:items.length===0?<p className="muted">Nenhum administrador cadastrado.</p>:
 <div className="dev-table-scroll"><table className="dev-table"><thead><tr><th>Nome</th><th>Usuário</th><th>E-mail</th><th>Situação</th></tr></thead>
 <tbody>{items.map(item=><tr key={item.id}><td>{item.name}</td><td>{item.username}</td><td>{item.email}</td><td>{item.active?"Ativo":"Inativo"}</td></tr>)}</tbody></table></div>}
 </section></div>;
}
