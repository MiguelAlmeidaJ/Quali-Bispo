import { SectionHeading } from "../ui/SectionHeading";
import { whatsappUrl } from "../../config/contact";
const benefits=["Todos os descontos da rede","Até 3 consultas por mês com desconto","Check-ups, psicologia e nutrição","Carteirinha digital em PDF","Sem carência"];
export function Plans(){return <section className="sec alt" id="planos"><div className="wrap"><SectionHeading eyebrow="Planos" title="Escolha o plano ideal">Sem taxa de adesão e sem fidelidade abusiva. Cancele quando quiser.</SectionHeading>
 <div className="planos"><article className="plano"><h3>Individual</h3><p className="hint">Para quem quer cuidar de si</p><div className="pr">R$ 49,90<small>/mês</small></div><ul>{benefits.map(b=><li key={b}>{b}</li>)}<li className="no">Dependentes</li></ul><a className="btn out full" href={whatsappUrl("Olá, Amanda! Quero conhecer o plano Individual Quali.")} target="_blank" rel="noopener noreferrer">Quero o Individual</a></article>
 <article className="plano dest"><span className="selo">MAIS ESCOLHIDO</span><h3>Familiar</h3><p className="hint">Titular + até 2 dependentes</p><div className="pr">R$ 89,90<small>/mês</small></div><ul>{benefits.map(b=><li key={b}>{b}</li>)}<li>Até 3 pessoas por R$ 29,97 cada</li></ul><a className="btn full" href={whatsappUrl("Olá, Amanda! Quero conhecer o plano Familiar Quali.")} target="_blank" rel="noopener noreferrer">Quero o Familiar</a></article></div>
 <p className="hint center spaced">O Cartão Quali Benefícios não é plano de saúde e não substitui planos regulamentados pela ANS.</p>
 </div></section>}
