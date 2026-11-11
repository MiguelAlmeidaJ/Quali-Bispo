"use client";
import {useMemo,useState} from "react";
import {useCatalog,centsMoney,type PublicCatalogItem} from "../../hooks/useCatalog";
import {SectionHeading} from "../ui/SectionHeading";
const averageSavings=(items:PublicCatalogItem[],category:string)=>{
 const subset=items.filter(item=>item.category===category && !/pacote/i.test(item.name));
 return subset.length?subset.reduce((sum,item)=>sum+(item.normalPriceCents-item.qualiPriceCents),0)/subset.length:0;
};
export function Simulator(){
 const {items,loading,error}=useCatalog();
 const [consultations,setConsultations]=useState(2),[checkups,setCheckups]=useState(1),[therapy,setTherapy]=useState(1);
 const [plan,setPlan]=useState<"Familiar"|"Individual">("Familiar");
 const result=useMemo(()=>{
  const limit=plan==="Familiar"?9:3;
  const count=Math.min(Math.max(0,consultations),limit);
  const usedTherapy=Math.min(Math.max(0,therapy),Math.max(0,limit-count));
  const gross=(count*averageSavings(items,"CONSULTA")+usedTherapy*averageSavings(items,"TERAPIA"))*12+
   Math.max(0,checkups)*averageSavings(items,"CHECKUP");
  const annualFee=12*(plan==="Familiar"?8990:4990);
  return {gross,annualFee,net:gross-annualFee};
 },[items,consultations,checkups,therapy,plan]);
 return <section className="sec" id="simulador"><div className="wrap">
  <SectionHeading eyebrow="Simulador" title="Quanto você pode economizar por ano?">Informe o uso médio da sua família e veja a economia estimada.</SectionHeading>
  <div className="sim"><div className="box"><div className="campos">
   <div><label htmlFor="sCons">Consultas médicas por mês (família)</label><input id="sCons" type="number" min="0" value={consultations} onChange={e=>setConsultations(Number(e.target.value)||0)}/></div>
   <div><label htmlFor="sChk">Check-ups por ano</label><input id="sChk" type="number" min="0" value={checkups} onChange={e=>setCheckups(Number(e.target.value)||0)}/></div>
   <div><label htmlFor="sTer">Consultas de psicologia/nutrição por mês</label><input id="sTer" type="number" min="0" value={therapy} onChange={e=>setTherapy(Number(e.target.value)||0)}/></div>
   <div><label htmlFor="sPlano">Plano</label><select id="sPlano" value={plan} onChange={e=>setPlan(e.target.value as "Familiar"|"Individual")}><option value="Familiar">Familiar · R$ 89,90/mês</option><option value="Individual">Individual · R$ 49,90/mês</option></select></div>
  </div><p className="hint spaced">Estimativa baseada na média de economia dos procedimentos ativos da tabela Quali; não representa garantia de atendimento ou desconto.</p></div>
  <div className="sim-res"><span>Economia líquida estimada no ano</span>
   {loading||error||items.length===0?<p>{loading?"Carregando valores...":"Estimativa indisponível."}</p>:<>
    <div className="big">{centsMoney(result.net)}</div>
    <dl><div><dt>Economia bruta</dt><dd>{centsMoney(result.gross)}</dd></div><div><dt>Mensalidades no ano</dt><dd>- {centsMoney(result.annualFee)}</dd></div><div><dt>Economia líquida</dt><dd>{centsMoney(result.net)}</dd></div></dl>
   </>}
  </div></div>
 </div></section>;
}
