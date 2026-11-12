"use client";
import { useState } from "react";
export function Hero() {
  const [cpf,setCpf]=useState("");
  const [birthday,setBirthday]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const onSubmit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setMessage("");
    if(cpf.replace(/\D/g,"").length!==11||!birthday){
      setMessage("Informe seu CPF com 11 dígitos e a data de nascimento cadastrada.");return;
    }
    setLoading(true);
    try{
      const response=await fetch("/api/associate/session",{
        method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
        body:JSON.stringify({cpf:cpf.replace(/\D/g,""),birthDate:birthday}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível confirmar seus dados.");
      window.location.assign("/associado");
    }catch(error){setMessage(error instanceof Error?error.message:"Falha ao consultar. Tente novamente.");}
    finally{setLoading(false);}
  };
  const mask=(value:string)=>value.replace(/\D/g,"").slice(0,11)
    .replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3")
    .replace(/(\d{3}\.\d{3}\.\d{3})(\d{1,2})$/,"$1-$2");
  return <section className="hero"><div className="wrap">
    <div><span className="tag">Clube de Benefícios em Saúde</span><h1>Cuide da saúde da sua família pagando bem menos.</h1>
      <p className="lead">Com o Cartão Quali Benefícios você tem descontos de até 50% em consultas com mais de 20 especialidades, psicologia, nutrição e check-ups. Sem carência e sem burocracia — até 3 consultas com desconto por mês para cada beneficiário (médicas, psicologia ou nutrição).</p>
      <div className="hero-stats">{[["até 50%","de desconto em consultas"],["20+","especialidades médicas"],["3","consultas por mês por pessoa"],["0","dias de carência"]].map(([value,label])=><div key={value}><b>{value}</b><span>{label}</span></div>)}</div>
    </div>
    <form id="acesso" className="box acesso" onSubmit={onSubmit}><h2>Área do associado</h2><p className="sub">Consulte seu cadastro, sua rede parceira e o histórico de benefícios.</p>
      <div className="f"><label htmlFor="member-cpf">CPF</label><input id="member-cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={cpf} onChange={event=>setCpf(mask(event.target.value))} autoComplete="off" required/></div>
      <div className="f"><label htmlFor="member-birthdate">Data de nascimento</label><input id="member-birthdate" type="date" required max={new Date().toISOString().slice(0,10)} value={birthday} onChange={event=>setBirthday(event.target.value)}/></div>
      <button className="btn full" type="submit" disabled={loading}>{loading?"Confirmando cadastro...":"Acessar minha área"}</button>
      {message&&<p role="status" className="msg err">{message}</p>}
      <div className="lgpd">🔒 <span>Seus dados são usados apenas para confirmar sua identidade, conforme a LGPD.</span></div>
    </form>
  </div></section>;
}
