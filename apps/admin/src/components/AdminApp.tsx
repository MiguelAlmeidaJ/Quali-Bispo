"use client";
import {useEffect,useState} from "react";
import {Sidebar,type AdminView} from "./Sidebar";
import {Login} from "./Login";
import {DashboardPage} from "../screens/DashboardPage";
import {ValidateCpfPage} from "../screens/ValidateCpfPage";
import {PlaceholderPage} from "../screens/PlaceholderPage";
import {PartnersPage} from "../screens/PartnersPage";
import {CatalogPage} from "../screens/CatalogPage";
import {FinancePage} from "../screens/FinancePage";
import {CustomerFormPage} from "../screens/CustomerFormPage";
import {AdminUsersPage} from "../screens/dev/AdminUsersPage";
import {AuditPage} from "../screens/dev/AuditPage";
import {SettingsPage} from "../screens/dev/SettingsPage";
import type {User} from "../types/admin";

const privileged = new Set<AdminView>(["dev-users","dev-audit","dev-settings"]);
export function AdminApp({customerRoute}:{customerRoute?:{mode:"new"}|{mode:"edit";id:string}}){
 const[user,setUser]=useState<User|null>(null);
 const[loading,setLoading]=useState(true);
 const[view,setView]=useState<AdminView>("dashboard");
 const[collapsed,setCollapsed]=useState(false);
 useEffect(()=>{
   fetch("/admin/api/session",{cache:"no-store"})
     .then(r=>r.ok?r.json():null)
     .then(data=>{if(data?.user){setUser(data.user);setView(customerRoute?"clients":data.user.role==="PARTNER"?"validate":new URLSearchParams(window.location.search).get("view") as AdminView||"dashboard");}})
     .catch(()=>{})
     .finally(()=>setLoading(false));
 },[]);
 async function logout(){
   try {await fetch("/admin/api/session",{method:"DELETE"});} finally {setUser(null);setView("dashboard");}
 }
 if(loading)return <div className="splash">Carregando painel Quali...</div>;
 if(!user)return <Login onLogin={u=>{setUser(u);setView(customerRoute?"clients":u.role==="PARTNER"?"validate":new URLSearchParams(window.location.search).get("view") as AdminView||"dashboard");}}/>;
 const allowedView:AdminView = user.role!=="DEV"&&privileged.has(view)?"dashboard":user.role==="PARTNER"&&view==="dashboard"?"validate":view;
 return <div className={`app-layout ${collapsed?"sidebar-collapsed":""}`}>
   <Sidebar user={user} view={allowedView} setView={next=>{if(customerRoute){window.location.assign(`/admin/?view=${next}`);}else setView(next);}} logout={logout} collapsed={collapsed} setCollapsed={setCollapsed}/>
   <main className="app-main">
     {customerRoute&&user.role!=="PARTNER"?<CustomerFormPage id={customerRoute.mode==="edit"?customerRoute.id:undefined}/>:
      allowedView==="dashboard"&&user.role!=="PARTNER"?<DashboardPage/>:
      allowedView==="validate"?<ValidateCpfPage/>:
      allowedView==="partners"&&user.role!=="PARTNER"?<PartnersPage/>:
      allowedView==="pricing"&&user.role!=="PARTNER"?<CatalogPage/>:
      allowedView==="clients"&&user.role!=="PARTNER"?<FinancePage type="customers"/>:
      allowedView==="payments"&&user.role!=="PARTNER"?<FinancePage type="issues"/>:
      allowedView==="dev-users"&&user.role==="DEV"?<AdminUsersPage/>:
      allowedView==="dev-audit"&&user.role==="DEV"?<AuditPage/>:
      allowedView==="dev-settings"&&user.role==="DEV"?<SettingsPage/>:
      <PlaceholderPage view={allowedView}/>}
   </main>
 </div>;
}
