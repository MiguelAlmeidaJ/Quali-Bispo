"use client";
import { useMemo,useState } from "react";
import { money,procedures,type Category } from "../../data/catalog";
import { SectionHeading } from "../ui/SectionHeading";
const average=(cat:Category)=>{const items=procedures.filter(p=>p.category===cat&&!/pacote/i.test(p.specialty));return items.reduce((sum,p)=>sum+(p.normal-p.quali),0)/items.length;};
export function Simulator(){
 const [consultations,setConsultations]=useState(2);const [checkups,setCheckups]=useState(1);const [therapy,setTherapy]=useState(1);const [plan,setPlan]=useState<"Familiar"|"Individual">("Familiar");
 const result=useMemo(()=>{const limit=plan==="Familiar"?9:3;const count=Math.min(Math.max(0,consultations),limit);const usedTherapy=Math.min(Math.max(0,therapy),Math.max(0,limit-count));const gross=(count*average("cons")+usedTherapy*average("terap"))*12+Math.max(0,checkups)*average("check");const annualFee=12*(plan==="Familiar"?89.9:49.9);return {gross,annualFee,net:gross-annualFee};},[consultations,checkups,therapy,plan]);
 return <section className="sec" id="simulador"><div className="wrap"><SectionHeading eyebrow="Simulador" title="Quanto você pode economizar por ano?">Informe o uso médio da sua família e veja a economia estimada.</SectionHeading>
 <div className="sim"><div className="box"><div className="campos">
 <div><label htmlFor="sCons">Consultas médicas por mês (família)</label><input id="sCons" type="number" min="0" value={consultations} onChange={e=>setConsultations(Number(e.target.value))}/></div>
 <div><label htmlFor="sChk">Check-ups por ano</label><input id="sChk" type="number" min="0" value={checkups} onChange={e=>setCheckups(Number(e.target.value))}/></div>
 <div><label htmlFor="sTer">Consultas de psicologia/nutrição por mês</label><input id="sTer" type="number" min="0" value={therapy} onChange={e=>setTherapy(Number(e.target.value))}/></div>
 <div><label htmlFor="sPlano">Plano</label><select id="sPlano" value={plan} onChange={e=>setPlan(e.target.value as "Familiar"|"Individual")}><option value="Familiar">Familiar · R$ 89,90/mês</option><option value="Individual">Individual · R$ 49,90/mês</option></select></div>
 </div><p className="hint spaced">Estimativa com a média dos valores da tabela oficial Quali (valor normal x valor Quali).</p></div>
 <div className="sim-res"><span>Economia líquida estimada no ano</span><div className="big">{money(result.net)}</div><dl><div><dt>Economia bruta</dt><dd>{money(result.gross)}</dd></div><div><dt>Mensalidades no ano</dt><dd>- {money(result.annualFee)}</dd></div><div><dt>Economia líquida</dt><dd>{money(result.net)}</dd></div></dl></div></div></div></section>;
}
