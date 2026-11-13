"use client";

import { useState } from "react";
import {
  FiActivity, FiBarChart2, FiChevronLeft, FiChevronRight,
  FiClipboard, FiDollarSign, FiFileText, FiLogOut,
  FiMenu, FiSearch, FiUsers, FiAlertCircle, FiCreditCard, FiX, FiSettings, FiShield, FiUserPlus,
} from "react-icons/fi";
import { FaRegHospital } from "react-icons/fa";
import { Brand } from "./Brand";
import type { IconType } from "react-icons";

export type AdminView =
  | "dashboard" | "validate" | "clients" | "payments"
  | "attendances" | "pricing" | "partners" | "reports" | "cards" | "depara"
  | "settings" | "dev-users" | "dev-audit" | "dev-settings";
type User = { name: string; role: "DEV" | "ADMIN" | "PARTNER" };

type MenuItem = {
  view: AdminView;
  label: string;
  icon: IconType;
  adminOnly?: boolean;
  devOnly?: boolean;
};

const items: MenuItem[] = [
  { view: "dashboard", label: "Painel", icon: FiBarChart2, adminOnly: true },
  { view: "validate", label: "Validar CPF", icon: FiSearch },
  { view: "clients", label: "Clientes", icon: FiUsers, adminOnly: true },
  { view: "depara", label: "De-para de clientes", icon: FiAlertCircle, adminOnly: true },
  { view: "payments", label: "Inadimplência", icon: FiDollarSign, adminOnly: true },
  { view: "attendances", label: "Atendimentos", icon: FiActivity },
  { view: "pricing", label: "Tabela de valores", icon: FiClipboard },
  { view: "partners", label: "Rede credenciada", icon: FaRegHospital, adminOnly: true },
  { view: "reports", label: "Relatórios", icon: FiFileText, adminOnly: true },
  { view: "dev-users", label: "Administradores", icon: FiUserPlus, devOnly: true },
  { view: "dev-audit", label: "Auditoria", icon: FiShield, devOnly: true },
  { view: "settings", label: "Configurações", icon: FiSettings, adminOnly: true },
  { view: "dev-settings", label: "Sistema", icon: FiShield, devOnly: true },
];

export function Sidebar({
  user, view, setView, logout, collapsed, setCollapsed,
}: {
  user: User;
  view: AdminView;
  setView: (view: AdminView) => void;
  logout: () => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const allowedItems = items.filter(item => (!item.adminOnly || user.role === "ADMIN" || user.role === "DEV") && (!item.devOnly || user.role === "DEV") && (item.view !== "pricing" || user.role === "PARTNER"));

  function navigate(nextView: AdminView) {
    setView(nextView);
    setMobileOpen(false);
  }

  return (
    <>
      <div className="mobile-toolbar">
        <button type="button" className="icon-button" onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="admin-sidebar">
          <FiMenu size={22} />
        </button>
        <Brand compact />
      </div>
      {mobileOpen && (
        <button type="button" className="sidebar-backdrop" aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)} />
      )}
      <aside id="admin-sidebar"
        className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Navegação do painel">
        <div className="sidebar-header">
          <div className="sidebar-brand"><Brand compact={collapsed} /></div>
          <button type="button" className="sidebar-collapse icon-button"
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiChevronRight size={19} /> : <FiChevronLeft size={19} />}
          </button>
          <button type="button" className="sidebar-mobile-close icon-button"
            aria-label="Fechar menu" onClick={() => setMobileOpen(false)}>
            <FiX size={21} />
          </button>
        </div>
        <nav className="sidebar-navigation" aria-label="Menu administrativo">
          {allowedItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.view}>
                <button type="button" onClick={() => navigate(item.view)}
                  className={`sidebar-link ${view === item.view ? "active" : ""}`}
                  aria-current={view === item.view ? "page" : undefined}
                  title={collapsed ? item.label : undefined}>
                  <Icon className="sidebar-icon" aria-hidden="true" size={19} />
                  <span className="sidebar-label">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <a className="sidebar-support" href="https://wa.me/553299388743"
            target="_blank" rel="noopener noreferrer" title="WhatsApp Comercial · Amanda">
            <FiActivity className="sidebar-icon" aria-hidden="true" size={19} />
            <span className="sidebar-label">Suporte comercial<small>Amanda · (32) 9938-8743</small></span>
          </a>
          <div className="sidebar-user">
            <span className="sidebar-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <div className="sidebar-user-text sidebar-label">
              <b>{user.name}</b>
              <small>{user.role === "DEV" ? "Desenvolvedor" : user.role === "ADMIN" ? "Administrador" : "Parceiro credenciado"}</small>
            </div>
            <button type="button" className="logout-button" onClick={logout}
              aria-label="Sair do painel" title="Sair do painel">
              <FiLogOut aria-hidden="true" size={19} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
