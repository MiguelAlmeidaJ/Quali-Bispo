import type {AdminView} from "../components/Sidebar";
const labels:Partial<Record<AdminView,string>> = {
 clients:"Clientes",payments:"Inadimplência",attendances:"Atendimentos",
 pricing:"Tabela de valores",partners:"Rede credenciada",reports:"Relatórios"
};
export function PlaceholderPage({view}:{view:AdminView}) {
 const label=labels[view]??"Módulo";
 return <><header className="page-title"><div><h1>{label}</h1><p>Módulo em preparação</p></div></header>
  <section className="panel"><h2>{label}</h2>
   <p className="muted">Dados e operações serão conectados à API. Nenhum cadastro fictício é exibido.</p>
  </section></>;
}
