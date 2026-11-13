"use client";
import {useCallback,useEffect,useState} from "react";
import {FiActivity,FiAlertCircle,FiCheckCircle,FiDownload,FiFileText,FiTrendingUp,FiUsers} from "react-icons/fi";

type Kind="customers"|"attendances"|"consultations"|"delinquents"|"validations"|"payments";
type Summary={month:string;customers:number;attendances:number;consultations:number;delinquents:number;validations:number;payments:number};
const reports=[
 {kind:"customers",title:"Base de clientes",description:"Cadastros financeiros, planos, situação e unidades. CPF exibido apenas pelos últimos 4 dígitos.",icon:FiUsers,count:"clientes"},
 {kind:"attendances",title:"Atendimentos",description:"Registros reais do mês escolhido, valores praticados e economia dos associados.",icon:FiActivity,count:"atendimentos"},
 {kind:"consultations",title:"Uso do limite de consultas",description:"Consultas por associado no mês escolhido. Referência visual de 3 consultas, sem bloqueio automático.",icon:FiTrendingUp,count:"consultas"},
 {kind:"delinquents",title:"Inadimplentes",description:"Clientes com situação Em aberto, Pendente, Tratativa ou Aguardando.",icon:FiAlertCircle,count:"clientes"},
 {kind:"validations",title:"Validações de CPF",description:"Histórico de consultas da equipe, resultados e acesso. Nenhum CPF completo é exportado.",icon:FiFileText,count:"consultas"},
 {kind:"payments",title:"Atualizações para Pago",description:"Mudanças de situação registradas no painel. Não substituem comprovantes de recebimento.",icon:FiCheckCircle,count:"alterações"},
] as const;
const monthNow=()=>{
 const now=new Date();
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
};
const countFor=(summary:Summary,kind:Kind):number=>summary[kind];
async function errorText(response:Response){
 try{
  const body=await response.json();
  return typeof body.message==="string"?body.message:body.error||"Falha ao consultar os relatórios";
 }catch{return "Falha ao consultar os relatórios";}
}
export function ReportsPage(){
 const [month,setMonth]=useState(monthNow());
 const [summary,setSummary]=useState<Summary|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [downloading,setDownloading]=useState<Kind|null>(null);
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch(`/admin/api/reports/summary?month=${encodeURIComponent(month)}`,{cache:"no-store",credentials:"same-origin"});
   if(!response.ok)throw new Error(await errorText(response));
   setSummary(await response.json() as Summary);
  }catch(err){setSummary(null);setError(err instanceof Error?err.message:"Relatórios indisponíveis");}
  finally{setLoading(false);}
 },[month]);
 useEffect(()=>{void refresh();},[refresh]);
 async function download(kind:Kind){
  setDownloading(kind);setError("");
  try{
   const response=await fetch(`/admin/api/reports/export/${kind}?month=${encodeURIComponent(month)}`,{
    credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw new Error(await errorText(response));
   const file=await response.blob();
   const url=URL.createObjectURL(file);
   try{
    const link=document.createElement("a");
    link.href=url;
    link.download=`quali-${kind}${kind==="attendances"||kind==="consultations"?`-${month}`:""}.csv`;
    document.body.appendChild(link);link.click();link.remove();
   }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível exportar o CSV.");}
  finally{setDownloading(null);}
 }
 return <div className="reports-page">
  <div className="reports-heading">
   <div><h1>Relatórios</h1><p>Exportação de dados do Quali Benefícios em CSV</p></div>
   <label className="reports-month">Mês de referência
    <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/>
   </label>
  </div>
  {error&&<p className="notice error" role="alert">{error}</p>}
  <div className="reports-grid">
   {reports.map(item=><article className="reports-card" key={item.kind}>
    <div className="reports-icon"><item.icon size={26} aria-hidden="true"/></div>
    <div className="reports-copy"><h2>{item.title}</h2><p>{item.description}</p>
     <small>{loading?"Consultando...":summary?`${countFor(summary,item.kind).toLocaleString("pt-BR")} ${item.count}`:"Indisponível"}</small>
    </div>
    <button className="reports-download" type="button" disabled={!summary||downloading!==null}
      onClick={()=>void download(item.kind)} aria-label={`Exportar ${item.title} em CSV`}>
     <FiDownload size={16} aria-hidden="true"/>
     {downloading===item.kind?"Gerando...":"CSV"}
    </button>
   </article>)}
  </div>
  <div className="reports-footnote">
   <p>Os relatórios de <strong>Atendimentos</strong> e <strong>Uso de consultas</strong> respeitam o mês selecionado; os demais refletem a base completa ou a situação atual.</p>
   <p>O módulo de recebimentos ainda não existe. <strong>Atualizações para Pago</strong> exporta apenas mudanças auditadas de status, sem afirmar que houve pagamento bancário.</p>
   <p>Os arquivos são restritos a DEV/ADMIN, contêm dados administrativos e devem ser armazenados com segurança. Não compartilhe exportações publicamente.</p>
  </div>
 </div>;
}
