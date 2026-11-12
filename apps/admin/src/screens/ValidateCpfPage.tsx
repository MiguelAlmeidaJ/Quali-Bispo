"use client";
import {useEffect,useState} from "react";
export const formatCpf=(value:string)=>{
 const digits=value.replace(/\D/g,"").slice(0,11);
 return digits.replace(/^(\d{3})(\d)/,"$1.$2")
  .replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3")
  .replace(/(\d{3}\.\d{3}\.\d{3})(\d{1,2})$/,"$1-$2");
};
type Lookup={
 found:boolean;eligible:boolean;message:string;source:"finance"|"beneficiary"|null;
 beneficiary?:{name:string;status:string;plan:string|null}|null;
 customer?:{id:string;name:string;status:string;plan:string|null;unit:string|null;cpfLast4:string|null}|null;
};
type Validation={id:string;at:string;actor:string;matched:boolean;eligible:boolean;source:string|null};
type AttendanceCustomer={id:string;name:string;status:string;cpfLast4:string|null;partner:{name:string}|null};
export function ValidateCpfPage({onCreateAttendance}:{onCreateAttendance?:(customer:AttendanceCustomer)=>void}){
 const [cpf,setCpf]=useState(""),[loading,setLoading]=useState(false);
 const [result,setResult]=useState<Lookup|null>(null),[error,setError]=useState("");
 const [history,setHistory]=useState<Validation[]>([]);
 async function refresh(){
  try{
   const r=await fetch("/admin/api/validations",{cache:"no-store"});
   if(r.ok)setHistory(await r.json() as Validation[]);
  }catch{}
 }
 useEffect(()=>{void refresh()},[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();const digits=cpf.replace(/\D/g,"");
  if(digits.length!==11){setError("Informe os 11 dígitos do CPF.");setResult(null);return;}
  setLoading(true);setError("");setResult(null);
  try{
   const response=await fetch("/admin/api/validate-cpf",{method:"POST",
    headers:{"content-type":"application/json"},body:JSON.stringify({cpf:digits})});
   const data=await response.json();
   if(!response.ok)throw new Error(typeof data.message==="string"?data.message:data.error||"Falha na consulta");
   setResult(data as Lookup);
   await refresh();
  }catch(err){setError(err instanceof Error?err.message:"Falha na validação");}
  finally{setLoading(false);}
 }
 return <>
  <header className="page-title"><div><h1>Validar CPF</h1><p>Confirme o cadastro e a situação de acesso do associado</p></div></header>
  <section className="panel">
   <h2>Consultar CPF do associado</h2>
   <form className="cpf-form" onSubmit={submit}>
    <div><label htmlFor="cpf">CPF do titular ou dependente</label>
     <input id="cpf" inputMode="numeric" placeholder="000.000.000-00" value={cpf} required maxLength={14}
      pattern="[0-9]{3}[.][0-9]{3}[.][0-9]{3}-[0-9]{2}"
      title="CPF no formato 000.000.000-00" autoComplete="off"
      onChange={e=>{setCpf(formatCpf(e.target.value));setError("");setResult(null);}}/>
    </div><button className="primary" disabled={loading}>{loading?"Consultando...":"Validar acesso"}</button>
   </form>
   {error&&<div role="alert" className="notice error">{error}</div>}
   {result&&<div className={`notice ${result.eligible?"success":"error"}`} role="status">
    <strong>{result.message}</strong>
    {result.found&&<div style={{marginTop:8}}>
     <b>{result.customer?.name||result.beneficiary?.name}</b> · Plano: {result.customer?.plan||result.beneficiary?.plan||"Não informado"} ·
     Situação: {result.customer?.status==="PAID"?"Pago":result.customer?.status||result.beneficiary?.status||"Não informada"}
     {result.customer?.unit&&<> · Unidade: {result.customer.unit}</>}
     {result.customer&&<p style={{margin:"8px 0 0"}}>{result.eligible?
      "Cadastro financeiro confirmado e acesso liberado.":
      "Cadastro identificado, mas o pagamento/situação precisa de revisão antes do atendimento."}</p>}
    </div>}
    {result.eligible&&result.customer&&onCreateAttendance&&<div className="cpf-attendance-actions">
     <button type="button" className="cpf-create-attendance" onClick={()=>onCreateAttendance({
      id:result.customer!.id,name:result.customer!.name,status:result.customer!.status,
      cpfLast4:result.customer!.cpfLast4,partner:result.customer!.unit?{name:result.customer!.unit}:null
     })}>Registrar atendimento <span aria-hidden="true">→</span></button>
     <span>O associado será selecionado automaticamente. Escolha a unidade e o procedimento na próxima etapa.</span>
    </div>}
    {result.eligible&&!result.customer&&<p className="cpf-attendance-hint">Este cadastro é da base antiga de beneficiários. Para registrar atendimentos no módulo financeiro, vincule-o primeiro ao cadastro de Clientes.</p>}
   </div>}
  </section>
  <section className="panel gap-panel"><h2>Últimas validações</h2>
   {history.length===0?<p className="muted">Nenhuma validação registrada recentemente.</p>:
    <div className="cpf-history"><table><thead><tr><th>DATA</th><th>OPERADOR</th><th>RESULTADO</th><th>ACESSO</th></tr></thead>
     <tbody>{history.map(item=><tr key={item.id}><td>{new Date(item.at).toLocaleString("pt-BR")}</td>
      <td>{item.actor}</td><td>{item.matched?"Cadastro localizado":"Não encontrado"}</td>
      <td>{item.eligible?"Liberado":"Não liberado"}</td></tr>)}</tbody>
    </table></div>}
   <p className="muted" style={{fontSize:12,marginTop:12}}>O histórico não exibe CPFs completos.</p>
  </section>
 </>;
}
