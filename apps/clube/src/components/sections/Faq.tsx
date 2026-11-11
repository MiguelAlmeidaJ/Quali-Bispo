import { faqs } from "../../data/catalog";
import { SectionHeading } from "../ui/SectionHeading";
export function Faq(){return <section className="sec alt" id="duvidas"><div className="wrap"><SectionHeading eyebrow="Dúvidas frequentes" title="Perguntas que sempre recebemos"/><div className="faq">{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>}
