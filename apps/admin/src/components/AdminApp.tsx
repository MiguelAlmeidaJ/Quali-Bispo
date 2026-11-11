"use client";
import {useEffect,useState} from "react";
import {Sidebar,type AdminView} from "./Sidebar";
import {Login} from "./Login";
import {DashboardPage} from "../pages/DashboardPage";
import {ValidateCpfPage} from "../pages/ValidateCpfPage";
import {PlaceholderPage} from "../pages/PlaceholderPage";
import {PartnersPage} from "../pages/PartnersPage";
import {CatalogPage} from "../pages/CatalogPage";
import {AdminUsersPage} from "../pages/dev/AdminUsersPage";
import {AuditPage} from "../pages/dev/AuditPage";
import {SettingsPage} from "../pages/dev/SettingsPage";
import type {User} from "../types/admin";

const privileged = new Set<AdminView>(["dev-users","dev-audit","dev-settings"]);
export function AdminApp(){
 const[user,setUser]=useState<User|null>(null);
 const[loading,setLoading]=useState(true);
 const[view,setView]=useState<AdminView>("dashboard");
 const[collapsed,setCollapsed]=useState(false);
 useEffect(()=>{
   fetch("/admin/api/session",{cache:"no-store"})
     .then(r=>r.ok?r.json():null)
     .then(data=>{if(data?.user){setUser(data.user);setView(data.user.role==="PARTNER"?"validate":"dashboard");}})
     .catch(()=>{})
     .finally(()=>setLoading(false));
 },[]);
 async function logout(){
   try {await fetch("/admin/api/session",{method:"DELETE"});} finally {setUser(null);setView("dashboard");}
 }
 if(loading)return <div className="splash">Carregando painel Quali...</div>;
 if(!user)return <Login onLogin={u=>{setUser(u);setView(u.role==="PARTNER"?"validate":"dashboard");}}/>;
 const allowedView:AdminView = user.role!=="DEV"&&privileged.has(view)?"dashboard":user.role==="PARTNER"&&view==="dashboard"?"validate":view;
 return <div className={`app-layout ${collapsed?"sidebar-collapsed":""}`}>
   <Sidebar user={user} view={allowedView} setView={setView} logout={logout} collapsed={collapsed} setCollapsed={setCollapsed}/>
   <main className="app-main">
     {allowedView==="dashboard"&&user.role!=="PARTNER"?<DashboardPage/>:
      allowedView==="validate"?<ValidateCpfPage/>:
      allowedView==="partners"&&user.role!=="PARTNER"?<PartnersPage/>:
      allowedView==="pricing"&&user.role!=="PARTNER"?<CatalogPage/>:
      allowedView==="dev-users"&&user.role==="DEV"?<AdminUsersPage/>:
      allowedView==="dev-audit"&&user.role==="DEV"?<AuditPage/>:
      allowedView==="dev-settings"&&user.role==="DEV"?<SettingsPage/>:
      <PlaceholderPage view={allowedView}/>}
   </main>
 </div>;
}
