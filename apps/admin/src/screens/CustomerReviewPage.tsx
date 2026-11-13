"use client";
import {useCallback,useEffect,useState} from "react";
import {FiAlertCircle,FiCheckCircle,FiEdit2,FiRefreshCw,FiSearch} from "react-icons/fi";
type Missing={id:string;name:string;cpfLast4:string|null;missing:string[]};
type Page={total:number;page:number;pageSize:number;items:Missing[]};
export function CustomerReviewPage(){
 const [result,setResult]=useState<Page|null>(null);
 const [page,setPage]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch(`/admin/api/customer-benefits/incomplete?page=${page}`,{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.message||data.error||"Falha ao carregar pendências");
   setResult(data);
  }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar registros");}
  finally{setLoading(false);}
 },[page]);
 useEffect(()=>{void reload();},[reload]);
 const total=result?.total||0;
 const totalPages=Math.max(1,Math.ceil(total/20));
 return <div className="customer-review-page">
  <header className="page-title finance-page-title"><div>
   <span className="customer-review-eyebrow">QUALIDADE CADASTRAL</span>
   <h1>De-para de clientes</h1>
   <p>Identifique os cadastros incompletos e corrija as informações diretamente em Clientes.</p>
  </div><button type="button" className="customer-review-refresh" onClick={()=>void reload()} disabled={loading}>
   <FiRefreshCw/> Atualizar</button></header>
  <div className="customer-review-stats">
   <article><FiAlertCircle/><div><strong>{total}</strong><span>Cadastros a revisar</span></div></article>
   <article><FiCheckCircle/><div><strong>Atualização automática</strong><span>Ao corrigir todos os campos, o cliente sai desta lista.</span></div></article>
  </div>
  {error&&<p className="notice error" role="alert">{error}</p>}
  <section className="finance-table-card">
   {loading?<div className="finance-empty">Carregando pendências...</div>:
   !result?.items.length?<div className="customer-review-empty"><FiCheckCircle size={32}/>
    <h2>Nenhuma pendência encontrada</h2><p>Os clientes ativos consultados estão com os campos essenciais preenchidos.</p></div>:
   <div className="finance-scroll"><table className="finance-table">
    <thead><tr><th>CLIENTE</th><th>CPF (FINAL)</th><th>INFORMAÇÕES FALTANTES</th><th>AÇÃO</th></tr></thead>
    <tbody>{result.items.map(row=><tr key={row.id}>
     <td><b>{row.name}</b></td><td>•••• {row.cpfLast4||"—"}</td>
     <td><div className="customer-review-tags">{row.missing.map(reason=>
      <span key={reason}>{reason}</span>)}</div></td>
     <td><a className="customer-edit-link" href={`/admin/cliente/${row.id}/edit`}><FiEdit2/> Corrigir cadastro</a></td>
    </tr>)}</tbody>
   </table></div>}
   <footer className="finance-footer"><span>{total} cliente(s) pendente(s) · 20 por página</span>
    <nav aria-label="Páginas de revisão"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button>
     <span>Página {page} de {totalPages}</span>
     <button type="button" disabled={page>=totalPages||loading} onClick={()=>setPage(p=>p+1)}>Próxima</button></nav>
   </footer>
  </section>
  <p className="customer-review-hint">A lista é recalculada a partir do banco. Datas de nascimento não informadas, CPFs inválidos, unidade/cartão não vinculados ou cartão não emitido aparecem até serem regularizados. Benefícios cancelados ficam preservados no cadastro de Clientes, fora desta fila operacional.</p>
 </div>;
}
