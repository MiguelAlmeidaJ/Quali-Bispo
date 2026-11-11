import { Brand } from "./Brand";
import { contact } from "../../config/contact";
export function Footer() {
  return <footer className="site-footer"><div className="wrap">
    <div className="cols">
      <div><a className="logo" href="#"><Brand /></a><p>Clube de benefícios em saúde com descontos em consultas, check-ups, psicologia e nutrição.</p></div>
      <div><h5>Navegação</h5><a href="#beneficios">Benefícios</a><a href="#valores">Tabela de valores</a><a href="#planos">Planos</a><a href="#rede">Rede parceira</a><a href="#duvidas">Dúvidas</a></div>
      <div><h5>Associado</h5><a href="#acesso">Acessar meu cartão</a><a href="#acesso">Baixar carteirinha</a><a href="/admin">Área do parceiro / administrador</a></div>
      <div><h5>Contato</h5><p>Atendimento comercial</p><a href={`tel:+${contact.whatsapp}`}>{contact.phone}</a><a href={`mailto:${contact.email}`}>{contact.email}</a><p>Seg–sex: 8h às 17h</p></div>
    </div>
    <div className="bot"><span>© {new Date().getFullYear()} Quali Benefícios · Clube de Benefícios em Saúde</span><span>Não é plano de saúde. Descontos válidos na rede parceira, com mensalidade em dia.</span></div>
  </div></footer>;
}
