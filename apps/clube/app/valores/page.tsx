import Link from "next/link";
import type {Metadata} from "next";
import {Header} from "../../src/components/layout/Header";
import {Footer} from "../../src/components/layout/Footer";
import {WhatsAppButton} from "../../src/components/layout/WhatsAppButton";
import {PriceTable} from "../../src/components/sections/PriceTable";

export const metadata:Metadata={
 title:"Tabela completa de valores | Quali Benefícios",
 description:"Consulte todos os valores de consultas, exames e procedimentos da rede Quali Benefícios.",
};
export default function ValoresPage(){
 return <><Header/><main>
  <div className="values-breadcrumb"><div className="wrap"><Link href="/">Início</Link><span aria-hidden="true"> / </span><span>Tabela de valores</span></div></div>
  <PriceTable full/>
 </main><Footer/><WhatsAppButton/></>;
}
