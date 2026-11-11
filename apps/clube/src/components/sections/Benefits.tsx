import { SectionHeading } from "../ui/SectionHeading";
import { procedures, money } from "../../data/catalog";
const benefits=[
{icon:"🩺",name:"Consultas médicas",detail:"Mais de 20 especialidades, incluindo cardiologia, ginecologia, pediatria, dermatologia e neurologia. Até 3 consultas por mês por beneficiário.",category:"cons" as const},
{icon:"💗",name:"Check-ups",detail:"Pacotes de exames e avaliações para cuidar de você e de sua família, sem limite mensal de uso.",category:"check" as const},
{icon:"🧠",name:"Psicologia e nutrição",detail:"Atendimento com profissionais da rede para acompanhar sua saúde e bem-estar.",category:"terap" as const}
];
export function Benefits(){return <section className="sec alt" id="beneficios"><div className="wrap">
  <SectionHeading eyebrow="Benefícios" title="Descontos para cada momento da sua saúde">Para você e seus dependentes. Consultas médicas com limite de 3 por mês por beneficiário; os demais benefícios podem ser usados sempre que precisar.</SectionHeading>
  <div className="bens">{benefits.map(b=>{const data=procedures.filter(p=>p.category===b.category);const pct=Math.max(...data.map(p=>Math.round((1-p.quali/p.normal)*100)));return <article className="ben" key={b.name}><span className="pct">até {pct}%</span><div className="ic">{b.icon}</div><h4>{b.name}</h4><p>{b.detail}</p><ul>{data.slice(0,3).map(p=><li key={p.specialty}><span>{p.specialty}</span><b>{money(p.quali)}</b></li>)}</ul><a href="#valores">Ver tabela completa →</a></article>;})}</div>
  <p className="hint center spaced">Valores da tabela oficial Quali Benefícios. Veja todos os procedimentos abaixo.</p>
</div></section>}
