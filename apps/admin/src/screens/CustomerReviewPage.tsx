"use client";
import {useCallback,useEffect,useState} from "react";
import {FiAlertCircle,FiCheckCircle,FiEdit2,FiRefreshCw,FiSearch,FiCreditCard} from "react-icons/fi";
type Missing={id:string;name:string;cpfLast4:string|null;missing:string[]};
type Page={total:number;page:number;pageSize:number;items:Missing[]};
export function CustomerReviewPage(){
 const [result,setResult]=useState<Page|null>(null);
 const [page,setPage]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[query,setQuery]=useState("");
 const [eligible,setEligible]=useState<number|null>(null),[issuing,setIssuing]=useState(false);
 const [issueMessage,setIssueMessage]=useState("");
 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch(`/admin/api/customer-benefits/incomplete?page=${page}&search=${encodeURIComponent(query)}`,{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.message||data.error||"Falha ao carregar pendências");
   setResult(data);
  }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar registros");}
  finally{setLoading(false);}
 },[page,query]);
 useEffect(()=>{const timer=setTimeout(()=>{setPage(1);setQuery(search.trim());},300);return ()=>clearTimeout(timer);},[search]);
 useEffect(()=>{void reload();},[reload]);
 const countEligible=useCallback(async()=>{
  try{
   const response=await fetch("/admin/api/customer-benefits/issue-only/count",{cache:"no-store"});
   if(!response.ok)throw new Error("Falha ao consultar cartões disponíveis");
   const data=await response.json() as {eligible:number};
   setEligible(data.eligible);
  }catch{setEligible(null);}
 },[]);
 useEffect(()=>{void countEligible();},[countEligible]);
 const refresh=async()=>{await Promise.all([reload(),countEligible()]);};
 const issueBatch=async()=>{
  if(!eligible||issuing)return;
  if(!window.confirm(`Emitir até 50 cartões agora? Há ${eligible} cliente(s) com TODOS os dados completos e somente o cartão pendente. Outros cadastros não serão alterados.`))return;
  setIssuing(true);setIssueMessage("");
  try{
   const response=await fetch("/admin/api/customer-benefits/issue-only/batch",{method:"POST"});
   const data=await response.json() as {issued?:number;skipped?:number;failed?:number;remaining?:number;message?:string};
   if(!response.ok)throw new Error(data.message||"Não foi possível emitir os cartões");
   setIssueMessage(`${data.issued||0} cartão(ões) emitido(s). ${data.skipped||0} ignorado(s), ${data.failed||0} falha(s). ${data.remaining||0} ainda elegível(is).`);
   await refresh();
  }catch(e){setIssueMessage(e instanceof Error?e.message:"Falha na emissão");}
  finally{setIssuing(false);}
 }; 
 const total=result?.total||0;
 const totalPages=Math.max(1,Math.ceil(total/20));
 return <div className="customer-review-page">
  <header className="page-title finance-page-title"><div>
   <span className="customer-review-eyebrow">QUALIDADE CADASTRAL</span>
   <h1>De-para de clientes</h1>
   <p>Identifique os cadastros incompletos e corrija as informações diretamente em Clientes.</p>
  </div><button type="button" className="customer-review-refresh" onClick={()=>void refresh()} disabled={loading||issuing}>
   <FiRefreshCw/> Atualizar</button></header>
  <div className="customer-review-stats">
   <article><FiAlertCircle/><div><strong>{total}</strong><span>Cadastros a revisar</span></div></article>
   <article><FiCheckCircle/><div><strong>Atualização automática</strong><span>Ao corrigir todos os campos, o cliente sai desta lista.</span></div></article>
  </div>
  <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
   <FiSearch aria-hidden="true"/>
   <input type="search" aria-label="Pesquisar clientes por nome ou CPF" placeholder="Pesquisar por nome, CPF completo ou 4 dígitos finais" value={search}
    onChange={event=>setSearch(event.target.value)} style={{width:"100%",maxWidth:480,padding:"12px 14px",border:"1px solid #cbdbea",borderRadius:10,background:"#fff",color:"#153855"}}/>
  </div>
  <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,margin:"10px 0 18px",padding:"14px 16px",background:"#fff",border:"1px solid #d7e4f1",borderRadius:12}}>
   <FiCreditCard aria-hidden="true" size={20}/>
   <div style={{flex:"1 1 250px"}}><strong>Emissão em lote — somente cartão pendente</strong>
    <div style={{fontSize:13,opacity:.75}}>{eligible===null?"Consultando cadastros elegíveis...":`${eligible} cliente(s) com todas as outras informações completas.`} Os demais continuam para correção manual.</div></div>
   <button type="button" className="customer-review-refresh" disabled={issuing||loading||!eligible} onClick={()=>void issueBatch()}>
    <FiCreditCard/> {issuing?"Emitindo...":"Emitir até 50 cartões"}</button>
  </div>
  {issueMessage&&<p className="notice" role="status">{issueMessage}</p>}
  {error&&<p className="notice error" role="alert">{error}</p>}
  <section className="finance-table-card">
   {loading?<div className="finance-empty">Carregando pendências...</div>:
   !result?.items.length?<div className="customer-review-empty"><FiCheckCircle size={32}/>
    <h2>{query?"Nenhum cliente encontrado":"Nenhuma pendência encontrada"}</h2><p>{query?"Tente pesquisar outro nome ou CPF.":"Os clientes ativos consultados estão com os campos essenciais preenchidos."}</p></div>:
   <div className="finance-scroll"><table className="finance-table">
    <thead><tr><th>CLIENTE</th><th>CPF (FINAL)</th><th>INFORMAÇÕES FALTANTES</th><th>AÇÃO</th></tr></thead>
    <tbody>{result.items.map(row=><tr key={row.id}>
     <td><b>{row.name}</b></td><td>•••• {row.cpfLast4||"—"}</td>
     <td><div className="customer-review-tags">{row.missing.map(reason=>
      <span key={reason}>{reason}</span>)}</div></td>
     <td>{row.missing.length===1&&row.missing[0]==="Cartão não emitido"?<span style={{fontSize:12,color:"#24784c",marginRight:10}}>Apto para emissão em lote</span>:null}<a className="customer-edit-link" href={`/admin/cliente/${row.id}/edit`}><FiEdit2/> Corrigir cadastro</a></td>
    </tr>)}</tbody>
   </table></div>}
   <footer className="finance-footer"><span>{total} {query?"resultado(s) na pesquisa":"cliente(s) pendente(s)"} · 20 por página</span>
    <nav aria-label="Páginas de revisão"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button>
     <span>Página {page} de {totalPages}</span>
     <button type="button" disabled={page>=totalPages||loading} onClick={()=>setPage(p=>p+1)}>Próxima</button></nav>
   </footer>
  </section>
  <p className="customer-review-hint">A lista é recalculada a partir do banco. Datas de nascimento não informadas, CPFs inválidos, unidade/cartão não vinculados ou cartão não emitido aparecem até serem regularizados. Benefícios cancelados ficam preservados no cadastro de Clientes, fora desta fila operacional.</p>
 </div>;
}
