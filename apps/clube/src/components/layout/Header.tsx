"use client";
import { useState } from "react";
import { Brand } from "./Brand";
const links = [["Benefícios","#beneficios"],["Valores","#valores"],["Como funciona","#como"],["Simulador","#simulador"],["Planos","#planos"],["Rede parceira","#rede"],["Dúvidas","#duvidas"]] as const;
export function Header() {
  const [open,setOpen]=useState(false);
  return <header className="site-header"><div className="wrap header-content">
    <a className="logo" href="#" aria-label="Quali Benefícios, início"><Brand /></a>
    <button className="menu-btn" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={()=>setOpen(!open)}>☰</button>
    <nav id="site-navigation" className={`nav ${open?"open":""}`} aria-label="Navegação principal">
      {links.map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)}>{label}</a>)}
      <a className="btn sm" href="#acesso" onClick={()=>setOpen(false)}>Área do associado</a>
    </nav>
  </div></header>;
}
