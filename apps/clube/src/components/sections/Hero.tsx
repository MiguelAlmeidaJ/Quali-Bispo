"use client";
import { useState } from "react";
export function Hero() {
  const [cpf,setCpf]=useState("");
  const [birthday,setBirthday]=useState("");
  const [message,setMessage]=useState("");
  const onSubmit=(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(cpf.replace(/\D/g,"").length!==11 || !birthday){setMessage("Informe um CPF válido e sua data de nascimento.");return;}
    setMessage("A consulta segura do associado estará disponível após a integração com a API Quali.");
  };
  return <section className="hero"><div className="wrap">
    <div><span className="tag">Clube de Benefícios em Saúde</span><h1>Cuide da saúde da sua família pagando bem menos.</h1>
      <p className="lead">Com o Cartão Quali Benefícios você tem descontos de até 50% em consultas com mais de 20 especialidades, psicologia, nutrição e check-ups. Sem carência e sem burocracia — até 3 consultas com desconto por mês para cada beneficiário (médicas, psicologia ou nutrição).</p>
      <div className="hero-stats">{[["até 50%","de desconto em consultas"],["20+","especialidades médicas"],["3","consultas por mês por pessoa"],["0","dias de carência"]].map(([value,label])=><div key={value}><b>{value}</b><span>{label}</span></div>)}</div>
    </div>
    <form id="acesso" className="box acesso" onSubmit={onSubmit}><h2>Área do associado</h2><p className="sub">Consulte seu cartão, baixe sua carteirinha e veja seus benefícios.</p>
      <div className="f"><label htmlFor="member-cpf">CPF</label><input id="member-cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={cpf} onChange={event=>setCpf(event.target.value)} autoComplete="off"/></div>
      <div className="f"><label htmlFor="member-birthdate">Data de nascimento</label><input id="member-birthdate" type="date" value={birthday} onChange={event=>setBirthday(event.target.value)}/></div>
      <button className="btn full" type="submit">Acessar meu cartão</button>
      {message&&<p role="status" className="msg err">{message}</p>}
      <div className="lgpd">🔒 <span>Seus dados são usados apenas para confirmar sua identidade, conforme a LGPD.</span></div>
    </form>
  </div></section>;
}
