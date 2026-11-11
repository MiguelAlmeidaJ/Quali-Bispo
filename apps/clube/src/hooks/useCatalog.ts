"use client";
import {useEffect,useState} from "react";
export type PublicCatalogItem={
 id:string;name:string;category:"CONSULTA"|"CHECKUP"|"EXAME"|"PROCEDIMENTO"|"TERAPIA";
 group:string;professional:string|null;notes:string|null;normalPriceCents:number;qualiPriceCents:number;
};
export function useCatalog(){
 const [items,setItems]=useState<PublicCatalogItem[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/v1/catalog",{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error("Falha ao carregar valores");return response.json() as Promise<PublicCatalogItem[]>;})
   .then(setItems).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Erro de consulta");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[]);
 return {items,loading,error};
}
export const centsMoney=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
